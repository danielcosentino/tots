const mongoose = require("mongoose");

const nestedClass = new mongoose.Schema(
  {
    type: String
  }
);

const ClassSchema = new mongoose.Schema(
	{
    classId: { type: String, required: true, unique: true },
    className: { type: String, required: true, unique: true },

    fall: { type: Boolean, required: true, unique: true },
    spring: { type: Boolean, required: true, unique: true },
    summer: { type: Boolean, required: true, unique: true },
    ocs: { type: Boolean, required: true, unique: true },
    lab: { type: Boolean, required: true, unique: true },
    honors: { type: Boolean, required: true, unique: true },

    creditHours: { type: Number, required: true, unique: true },
    diff: { type: Number, required: true, unique: true },
    classType: { type: String, required: true, unique: true },

    prereqs: [ { class: [ nestedClass ] } ],
    postReqs: [ { class: [ nestedClass ] } ],
    compPostReqs: [nestedClass]
	},
	{ collection: "Classes" }
);

const model = mongoose.model("ClassSchema", ClassSchema);

module.exports = model;