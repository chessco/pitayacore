import '@testing-library/jest-dom';

// Mock scrollIntoView which is not implemented in jsdom
window.Element.prototype.scrollIntoView = function() {};
