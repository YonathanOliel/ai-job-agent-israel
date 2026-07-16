/** Extracts plain text from a resume file of a specific format. */
export interface TextExtractor {
  extract(buffer: Buffer): Promise<string>;
}
