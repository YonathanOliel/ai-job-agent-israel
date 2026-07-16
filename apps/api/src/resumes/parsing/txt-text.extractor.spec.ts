import { TxtTextExtractor } from './txt-text.extractor';

describe('TxtTextExtractor', () => {
  const extractor = new TxtTextExtractor();

  it('decodes UTF-8 text including Hebrew', async () => {
    const text = 'Full Stack Developer — מפתח פולסטאק';
    const result = await extractor.extract(Buffer.from(text, 'utf8'));
    expect(result).toBe(text);
  });
});
