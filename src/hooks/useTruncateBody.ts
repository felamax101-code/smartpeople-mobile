const truncate = (text: string, max: number = 100): string => {
  if (text.length <= max) return text;

  const sliced = text.slice(0, max);

  // Only cut at a word boundary if the next character starts a new word,
  // otherwise back up to the last whitespace so we don't split a word or URL
  const nextChar = text[max];
  const lastSpace = Math.max(sliced.lastIndexOf(" "), sliced.lastIndexOf("\n"));

  const cut = /\s/.test(nextChar) || lastSpace === -1
    ? sliced
    : sliced.slice(0, lastSpace);

  return cut.trimEnd() + "...";
};

export default truncate;