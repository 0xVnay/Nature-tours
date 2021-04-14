const express = require("express");
const reviewController = require("../controllers/reviewController");
const authController = require("../controllers/authController");

//To pass the tourId to the reviewRouter we set mergeParams option true on the reviewRouter.
//By default mergeParams is false which means each router get access to the params
//for their specific routes.

const router = express.Router({ mergeParams: true });

// POST /tour/3243245231535235/reviews
// GET /tour/3243245231535235/reviews
// GET /tour/3243245231535235/reviews/23414324234234135

router.use(authController.protect);

router
  .route("/")
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo("user"),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route("/:id")
  .get(reviewController.getReview)
  //Only users and admins should update and delete reviews and not the guides and lead-guides
  .patch(
    authController.restrictTo("user", "admin"),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo("user", "admin"),
    reviewController.deleteReview
  );

module.exports = router;
