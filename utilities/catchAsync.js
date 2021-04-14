//this function catches the error which is rejected by promises in the
//asynchronous funtions that are wrapped by the catchAsync function
module.exports = fn => {
  //this function returns an anonymous function which will be called 
  //by express when a route is hit and for all the functions wrapped in the 
  //catchAsync function error handling will be done at one single place i.e. 
  //catch block in this function.
  return (req, res, next) => {
    fn(req, res, next).catch(next); 
    //error catched are passed onto the next function which passes it to the 
    //globalErrorHandler (errorController.js)
  };
};
