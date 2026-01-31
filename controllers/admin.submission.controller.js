import TextSubmission from "../models/textSubmission.model.js";

export const getAllSubmissions = async (req, res) => {
  try {
    const submissions = await TextSubmission.find()
      .populate("user_id", "name email")
      .sort({ created_at: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSubmissionById = async (req, res) => {
  try {
    const submission = await TextSubmission.findById(req.params.id)
      .populate("user_id", "name email")
      .populate("normalized_words.word_id");

    if (!submission)
      return res.status(404).json({ message: "Submission not found" });
    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteSubmission = async (req, res) => {
  try {
    const deleted = await TextSubmission.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Submission not found" });
    res.json({ message: "Submission deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateSubmission = async (req, res) => {
  try {
    const { raw_text } = req.body;
    const submission = await TextSubmission.findByIdAndUpdate(
      req.params.id,
      { raw_text },
      { new: true }
    );
    if (!submission)
      return res.status(404).json({ message: "Submission not found" });
    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

