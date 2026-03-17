const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  // Numeric ID kept from original JSON for URL compatibility
  courseId:    { type: Number, required: true, unique: true, index: true },
  area:        { type: String, required: true, index: true },
  term:        { type: String, required: true },
  course:      { type: String, required: true },
  faculty:     { type: String, required: true, index: true },
  credits:     { type: Number, default: null },
  description: { type: String, default: '' },
}, { timestamps: true });

// Virtual: expose courseId as "id" in JSON responses
courseSchema.set('toJSON', {
  virtuals: false,
  transform(doc, ret) {
    ret.id = ret.courseId;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Course', courseSchema);
