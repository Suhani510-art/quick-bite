import Cart from '../models/cart.model.js';
import Deal from '../models/deal.model.js';
import { attachDynamicPrice } from '../utils/dynamicPricing.js';

const getPopulatedCart = async (userId) => {
  return await Cart.findOne({ user: userId })
    .populate('items.deal')
    .lean();
};

export const getCart = async (req, res) => {
  try {
    const cart = await getPopulatedCart(req.user.id);

    if (!cart) {
      return res.status(200).json({ success: true, items: [], totalAmount: 0 });
    }

    const enrichedItems = cart.items.map((item) => ({
      ...item,
      deal: attachDynamicPrice(item.deal),
    }));

    const totalAmount = enrichedItems.reduce((sum, item) => {
      return sum + item.deal.currentPrice * item.quantity;
    }, 0);

    res.status(200).json({
      success: true,
      items: enrichedItems,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    });
  } catch (error) {
    console.error('GetCart error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { dealId, quantity = 1 } = req.body;

    const deal = await Deal.findById(dealId);
    if (!deal || !deal.isActive || new Date() > deal.expiryTime) {
      return res.status(400).json({
        success: false,
        message: 'This deal is no longer available',
      });
    }

    if (quantity > deal.quantity - deal.quantitySold) {
      return res.status(400).json({
        success: false,
        message: `Only ${deal.quantity - deal.quantitySold} items remaining`,
      });
    }

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = await Cart.create({
        user:  req.user.id,
        items: [{ deal: dealId, quantity }],
      });
    } else {
      const existingItem = cart.items.find(
        (item) => item.deal.toString() === dealId
      );
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ deal: dealId, quantity });
      }
      await cart.save();
    }

    const populatedCart = await getPopulatedCart(req.user.id);
    const enrichedItems = populatedCart.items.map((item) => ({
      ...item,
      deal: attachDynamicPrice(item.deal),
    }));

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      items: enrichedItems,
    });
  } catch (error) {
    console.error('AddToCart error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { dealId }   = req.params;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1',
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.find((i) => i.deal.toString() === dealId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not in cart' });
    }

    item.quantity = quantity;
    await cart.save();

    res.status(200).json({ success: true, message: 'Cart updated' });
  } catch (error) {
    console.error('UpdateCartItem error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      (item) => item.deal.toString() !== req.params.dealId
    );

    await cart.save();

    res.status(200).json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('RemoveFromCart error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $set: { items: [] } }
    );

    res.status(200).json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('ClearCart error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};