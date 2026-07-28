import { NormalizerService } from './normalizer.service';
import {
  NormalizedContent,
  SocialContentType,
  SocialSource,
} from '../dto/normalized-content';

const item = (externalId: string, content = 'hello'): NormalizedContent => ({
  source: SocialSource.FACEBOOK,
  type: SocialContentType.POST,
  externalId,
  content,
});

describe('NormalizerService', () => {
  const service = new NormalizerService();

  it('trims content', () => {
    const [out] = service.normalize([item('1', '  spaced  ')]);
    expect(out.content).toBe('spaced');
  });

  it('drops items without an externalId', () => {
    const out = service.normalize([{ ...item('1'), externalId: '' }]);
    expect(out).toHaveLength(0);
  });

  it('de-duplicates by source + externalId within a batch', () => {
    const out = service.normalize([item('1'), item('1'), item('2')]);
    expect(out.map((i) => i.externalId)).toEqual(['1', '2']);
  });
});
