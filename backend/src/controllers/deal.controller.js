import Deal from '../models/deal.model.js';
import { attachDynamicPrice } from '../utils/dynamicPricing.js';

export const createDeal = async (req, res) => {
  try {
    const { name, description, category, originalPrice, quantity, expiryTime, image, location , restaurantAddress} = req.body;

    if (new Date(expiryTime) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Expiry time must be in the future',
      });
    }

    const deal = await Deal.create({
      seller: req.user.id,
      name, description, category, originalPrice,
      quantity, expiryTime, image, restaurantAddress, location,
    });

    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      deal: attachDynamicPrice(deal.toObject()),
    });
  } catch (error) {
    console.error('CreateDeal error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllDeals = async (req, res) => {
  try {
    const { minPrice, maxPrice, category, expiryWithin, sort = 'expiryTime', page = 1, limit = 12 } = req.query;

    const filter = {
      isActive: true,
      expiryTime: { $gt: new Date() },
    };
    if (req.query.search) {
  filter.name = {
    $regex: req.query.search,
    $options: 'i', // case insensitive
  };
}

    if (category)    filter.category = category;
    if (minPrice)    filter.originalPrice = { ...filter.originalPrice, $gte: Number(minPrice) };
    if (maxPrice)    filter.originalPrice = { ...filter.originalPrice, $lte: Number(maxPrice) };
    if (expiryWithin) {
      const cutoff = new Date(Date.now() + Number(expiryWithin) * 60 * 60 * 1000);
      filter.expiryTime = { $gt: new Date(), $lte: cutoff };
    }

    const sortMap = {
      expiryTime: { expiryTime: 1 },
      priceLow:   { originalPrice: 1 },
      priceHigh:  { originalPrice: -1 },
      newest:     { createdAt: -1 },
    };
    const sortOption = sortMap[sort] || sortMap.expiryTime;

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Deal.countDocuments(filter);

    const deals = await Deal.find(filter)
      .populate('seller', 'name email')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const dealsWithPricing = deals.map(attachDynamicPrice);

    res.status(200).json({
      success: true,
      total,
      page:       Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      deals:      dealsWithPricing,
    });
  } catch (error) {
    console.error('GetAllDeals error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDealById = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('seller', 'name email')
      .lean();

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    res.status(200).json({
      success: true,
      deal: attachDynamicPrice(deal),
    });
  } catch (error) {
    console.error('GetDealById error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyDeals = async (req, res) => {
  try {
    const deals = await Deal.find({ seller: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const dealsWithPricing = deals.map(attachDynamicPrice);

    res.status(200).json({
      success: true,
      count: deals.length,
      deals: dealsWithPricing,
    });
  } catch (error) {
    console.error('GetMyDeals error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDeal = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    if (deal.seller.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    const allowedFields = ['name', 'description', 'category', 'originalPrice', 'quantity', 'expiryTime', 'image', 'location', 'isActive'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) deal[field] = req.body[field];
    });

    const updated = await deal.save();

    res.status(200).json({
      success: true,
      message: 'Deal updated successfully',
      deal: attachDynamicPrice(updated.toObject()),
    });
  } catch (error) {
    console.error('UpdateDeal error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDeal = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    if (deal.seller.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    await deal.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Deal deleted successfully',
    });
  } catch (error) {
    console.error('DeleteDeal error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};