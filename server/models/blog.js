const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const voteSchema = require('./vote');
const commentSchema = require('./comment');

const blogSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  title: { type: String, required: true },
  text: { type: String, required: true },
  tags: [{ type: String, required: true }],
  score: { type: Number, default: 0 },
  votes: [voteSchema],
  comments: [commentSchema],
  created: { type: Date, default: Date.now },
  views: { type: Number, default: 0 }
});

blogSchema.set('toJSON', { getters: true });

blogSchema.options.toJSON.transform = (doc, ret) => {
  const obj = { ...ret };
  delete obj._id;
  delete obj.__v;
  return obj;
};

blogSchema.methods = {
  vote: function (user, vote) {
    const existingVote = this.votes.find((v) => v.user._id.equals(user));

    if (existingVote) {
      // reset score
      this.score -= existingVote.vote;
      if (vote == 0) {
        // remove vote
        this.votes.pull(existingVote);
      } else {
        //change vote
        this.score += vote;
        existingVote.vote = vote;
      }
    } else if (vote !== 0) {
      // new vote
      this.score += vote;
      this.votes.push({ user, vote });
    }

    return this.save();
  },

  addComment: function (author, body) {
    this.comments.push({ author, body });
    return this.save();
  },

  removeComment: function (id) {
    const comment = this.comments.id(id);
    if (!comment) throw new Error('Comment not found');
    comment.remove();
    return this.save();
  }
};

blogSchema.pre(/^find/, function () {
  this.populate('author')
    .populate('comments.author', '-role')
});

blogSchema.pre('save', function (next) {
  this.wasNew = this.isNew;
  next();
});

blogSchema.post('save', function (doc, next) {
  if (this.wasNew) this.vote(this.author._id, 1);
  doc
    .populate('author')
    .populate('comments.author', '-role')
    .execPopulate()
    .then(() => next());
});

module.exports = mongoose.model('Blog', blogSchema);
