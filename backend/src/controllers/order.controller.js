import Order from '../models/order.model.js';
import Cart from '../models/cart.model.js';
import Deal from '../models/deal.model.js';
import { calculateDynamicPrice } from '../utils/dynamicPricing.js';
import { checkDeliveryFeasibility } from '../utils/distanceCheck.js';

export const placeOrder = async (req, res) => {
  try {
    const { deliveryType, buyerAddress, pickupTime, note } = req.body;

    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.deal');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty',
      });
    }

    // Delivery address validation
    if (deliveryType === 'delivery' && !buyerAddress?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide delivery address',
      });
    }

    const orderItems = [];
    let totalAmount  = 0;
    let maxDeliveryMinutes = 0;

    for (const cartItem of cart.items) {
      const deal = cartItem.deal;

      // Deal validity check
      if (!deal || !deal.isActive || new Date() > deal.expiryTime) {
        return res.status(400).json({
          success: false,
          message: `"${deal?.name || 'A deal'}" is no longer available`,
        });
      }

      // Stock check
      const available = deal.quantity - deal.quantitySold;
      if (cartItem.quantity > available) {
        return res.status(400).json({
          success: false,
          message: `Only ${available} units of "${deal.name}" available`,
        });
      }

      // ── Distance check for delivery ──────────────────────────
      if (deliveryType === 'delivery') {
        if (!deal.restaurantAddress) {
          return res.status(400).json({
            success: false,
            message: `Restaurant address not available for "${deal.name}"`,
          });
        }

        const feasibility = await checkDeliveryFeasibility(
          deal.restaurantAddress,
          buyerAddress,
          deal.expiryTime
        );

        if (!feasibility.canDeliver) {
          return res.status(400).json({
            success: false,
            message: `Cannot deliver "${deal.name}": ${feasibility.message}`,
            feasibility,
          });
        }

        maxDeliveryMinutes = Math.max(
          maxDeliveryMinutes,
          feasibility.durationMinutes
        );
      }

      const { currentPrice } = calculateDynamicPrice(
        deal.originalPrice,
        deal.expiryTime
      );

      orderItems.push({
        deal:            deal._id,
        name:            deal.name,
        quantity:        cartItem.quantity,
        priceAtPurchase: currentPrice,
      });

      totalAmount += currentPrice * cartItem.quantity;
    }

    // Create order
    const order = await Order.create({
      buyer:                    req.user.id,
      items:                    orderItems,
      totalAmount:              parseFloat(totalAmount.toFixed(2)),
      note:                     note || '',
      deliveryType:             deliveryType || 'pickup',
      buyerAddress:             buyerAddress || '',
      pickupTime:               pickupTime || '',
      estimatedDeliveryMinutes: maxDeliveryMinutes,
    });

    // Update quantitySold
    for (const item of orderItems) {
      await Deal.findByIdAndUpdate(item.deal, {
        $inc: { quantitySold: item.quantity },
      });
    }

    // Clear cart
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $set: { items: [] } }
    );

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! 🎉',
      order,
    });
  } catch (error) {
    console.error('PlaceOrder error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user.id })
      .populate('items.deal', 'name image category')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error('GetMyOrders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.deal', 'name image category seller');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.buyer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('GetOrderById error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const checkDelivery = async (req, res) => {
  try {
    const { dealId, buyerAddress } = req.body;

    if (!buyerAddress?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your address',
      });
    }

    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found',
      });
    }

    if (!deal.restaurantAddress) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant address not available',
      });
    }

    const feasibility = await checkDeliveryFeasibility(
      deal.restaurantAddress,
      buyerAddress,
      deal.expiryTime
    );

    res.status(200).json({
      success: true,
      ...feasibility,
    });
  } catch (error) {
    console.error('CheckDelivery error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};