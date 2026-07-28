import {
  findEmergingTopics,
  matchCommentVolume,
  matchKeywords,
  matchNegativeSentiment,
} from './alert-matchers';

describe('alert-matchers', () => {
  describe('matchKeywords', () => {
    it('matches case-insensitively and returns hits', () => {
      expect(
        matchKeywords('Hay CORRUPCIÓN en el municipio', ['corrupción']),
      ).toEqual(['corrupción']);
    });
    it('returns empty when no keyword matches', () => {
      expect(matchKeywords('todo bien', ['crisis'])).toEqual([]);
    });
  });

  describe('matchNegativeSentiment', () => {
    it('fires on explicit NEGATIVE', () => {
      expect(matchNegativeSentiment('NEGATIVE', null)).toBe(true);
    });
    it('fires when score below threshold', () => {
      expect(matchNegativeSentiment('NEUTRAL', -0.5)).toBe(true);
    });
    it('does not fire on positive score', () => {
      expect(matchNegativeSentiment('POSITIVE', 0.8)).toBe(false);
    });
  });

  describe('matchCommentVolume', () => {
    it('fires at/above threshold', () => {
      expect(matchCommentVolume(50, 50)).toBe(true);
    });
    it('does not fire below threshold or with bad input', () => {
      expect(matchCommentVolume(10, 50)).toBe(false);
      expect(matchCommentVolume(null, 50)).toBe(false);
    });
  });

  describe('findEmergingTopics', () => {
    it('returns topics meeting the threshold, sorted by count', () => {
      const lists = [
        ['Agua', 'Seguridad'],
        ['Agua'],
        ['Agua', 'Salud'],
        ['Seguridad'],
      ];
      expect(findEmergingTopics(lists, 2)).toEqual([
        { topic: 'Agua', count: 3 },
        { topic: 'Seguridad', count: 2 },
      ]);
    });
  });
});
