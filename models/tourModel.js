const mongoose = require("mongoose");
const slugify = require("slugify");

const User = require("./userModel");

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A tour must have a name"],
      unique: true,
      trim: true,
      maxlength: [40, "A tour name must have less or equal than 40 characters"],
      minlength: [10, "A tour name must have more or equal than 10 characters"]
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, "A tour must have a duration"]
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have a group size"]
    },
    difficulty: {
      type: String,
      required: [true, "A tour must have a diffiulty"],
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty is either: easy, medium, difficult"
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be above 5.0"]
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, "A tour must have a price"]
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // this only points to current doc on NEW document creation
          return val < this.price;
        },
        message: "Discount price ({VALUE}) should be regular price"
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, "A tour must have a summary"]
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, "A tour must have a cover image"]
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      //GeoJSON
      type: {
        type: String,
        default: "Point",
        enum: ["Point"]
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"]
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// tourSchema.index({ price: 1 }); //single field index
// 1 for storing price index in ascending order, -1 for desc.
tourSchema.index({ price: 1, ratingsAverage: -1 }); // composite index
tourSchema.index({ slug: 1 });

//to use GEOSPATIAL QUERIES we have to have index on the field on which the geospatial query will be performed.
tourSchema.index({ startLocation: "2dsphere" });

//-------------------------------------------------------------------------------------
//VIRTUAL FIELDS
tourSchema.virtual("durationWeeks").get(function() {
  return this.duration / 7;
});

//VIRTUAL POPULATE REVIEWS IN TOUR MODEL
//as we are using parent referencing to connect tour and reviews, the tours have no idea
//which reviews are connected to them. And we cannot store all the reviews IDs on the
//tours using child referencing as the tour document can grow very large.
//So we use VIRTUAL property 'reviews' on tour model and not save reviews in the DB
//and populate the reviews when a query is made.

//setting up the virtual field and we populate it only when a single tour is fetched
//not all the tours, beacuse reviews are not showed on the list of tours but when a
//single tour is accesssed. So we populate it in the getTour() and not globally in the
//tour model using a query middleware
tourSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id"
});
//-------------------------------------------------------------------------------------

//DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre("save", function(next) {
  // this points to current document
  this.slug = slugify(this.name, { lower: true });
  next();
});

// // this func replaces the guides user id with users before saving the document
// tourSchema.pre("save", async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.post("save", function(doc, next) {
//   console.log(doc);
//   next();
// });

//QUERY MIDDLEWARE
//'^find' is a regex to target all query methods starting with
//'find' (find, findOne, findById etc.)
// tourSchema.pre(/^find/, function(next) {
//   // this points to current query object
//   this.find({ secretTour: { $ne: true } });
//   this.start = Date.now();
//   next();
// });

// tourSchema.post(/^find/, function(doc, next) {
//   console.log(`Query took  ${Date.now() - this.start} milliseconds`);
//   next();
// });

//this middleware always populate the guides field with user data before any find query
tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: "guides",
    select: "-__v -passwordChangedAt"
  });
  next();
});

//AGGREGATION MIDDLEWARE
// tourSchema.pre("aggregate", function(next) {
//   //this points to the current aggregation object
//   //as this.pipeline is array of different aggregate operators like find,
//   //match, group etc. and to add match to starting of the array we use unshift()
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });

const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
