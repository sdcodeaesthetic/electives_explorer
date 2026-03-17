const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Foreign keys
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },

  // Denormalised for fast reads (no populate needed on list)
  username:     { type: String, required: true },
  name:         { type: String, required: true },

  courseRating: { type: Number, min: 0, max: 5, default: 0 },
  profRating:   { type: Number, min: 0, max: 5, default: 0 },
  comment:      { type: String, default: '' },
  timestamp:    { type: Date,   default: Date.now },
}, { timestamps: true });

// Expose _id as "id" in JSON responses
reviewSchema.set('toJSON', {
  virtuals: false,
  transform(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Review', reviewSchema);
