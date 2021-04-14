class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    //excluding page, sort, limit, fields from the query object as they are
    //not used for quering, but for sorting and pagination
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach(el => delete queryObj[el]);

    //converting query object into string so that we can use regex
    let queryStr = JSON.stringify(queryObj);

    //replacing the query operators like 'gte' to their mongodb varients '$gte'
    //because in req.query express returns object like {duration: {gte: 5}}
    //but we want {duration: {$gte: 5}}
    //also in URL query with operators are passed after '?' like duration[gte]=5
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    //We return 'this' (apiFeatures instance or object) so that after calling
    //any apiFeatures method we can chain other methods
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");

      this.query = this.query.select(fields);
    } else {
      //excluding __v property
      this.query = this.query.select("-__v");
    }

    return this;
  }

  paginate() {
    const page = +this.queryString.page || 1;
    const limit = +this.queryString.limit || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
module.exports = APIFeatures;
