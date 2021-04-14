const express = require("express");
const tourController = require("../controllers/tourController");
const authController = require("../controllers/authController");
const reviewRouter = require("../routes/reviewRoutes");

const router = express.Router();

// NESTED ROUTES
// POST /tour/3243245231535235/reviews
// GET /tour/3243245231535235/reviews
// GET /tour/3243245231535235/reviews/23414324234234135

//It is not ideal to place review routes in tours routes, but as review route start
//with tour route we will redirect it from here to reviewRouter
//For ex: to create a review we have to GET "/api/v1/tours/:tourId/reviews/"
//For "/api/v1/tours" app.js redirect it to tourRoutes and after which for
//"/:tourId/reviews" tourRouter will redirect it to reviewRouter.

//To pass the tourId to the reviewRouter we set mergeParams option true on the reviewRouter.
//By default mergeParams is false which means each router get access to the params
//for their specific routes.

router.use("/:tourId/reviews", reviewRouter);

router
  .route("/top-5-cheap")
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route("/tour-stats").get(tourController.getTourStats);
router
  .route("/monthly-plan/:year")
  .get(
    authController.protect,
    authController.restrictTo("admin", "lead-guide", "guide"),
    tourController.getMonthlyPlan
  );

router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(tourController.getToursWithin);
//***********************************************************************/
//Two methods of passing route parameters
// tours-within?distance=233&center=-40,45&unit=mi -> USING QUERY STRING
// accessible using : req.query
// tours-within/400/center/34.111745,-118.13491/unit/mi -> USING QUERY PARAMS
// accessible using : req.params
//***********************************************************************/

router.route("/distances/:latlng/unit/:unit").get(tourController.getDistances);

router
  .route("/")
  //we protect the get all tours route from authorized access using the
  //protect middleware
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.createTour
  );

router
  .route("/:id")
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.updateTour
  )
  .delete(
    authController.protect, //Authentication
    authController.restrictTo("admin", "lead-guide"), //Authorization
    tourController.deleteTour
  );

module.exports = router;
