/**
 * Lightweight document type classifier from OCR text.
 * This is intentionally heuristic-based and fast.
 */
function classifyDocument(rawText = '') {
  const text = rawText.toLowerCase();

  const patterns = [
    {
      type: 'Passport',
      regexes: [/passport/, /nationality/, /date of birth/, /place of birth/, /mrz/]
    },
    {
      type: 'ID Card',
      regexes: [/id card/, /identity/, /date of birth/, /issued/, /expiry/]
    },
    {
      type: 'Receipt',
      regexes: [/subtotal/, /total/, /tax/, /invoice/, /cashier/, /change/]
    },
    {
      type: 'Printed Document',
      regexes: [/chapter/, /introduction/, /summary/, /conclusion/, /page \d+/]
    }
  ];

  let best = { type: 'Unknown', score: 0 };

  for (const candidate of patterns) {
    const score = candidate.regexes.reduce((acc, regex) => (regex.test(text) ? acc + 1 : acc), 0);
    if (score > best.score) {
      best = { type: candidate.type, score };
    }
  }

  return best.type;
}

module.exports = {
  classifyDocument
};
