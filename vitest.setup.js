import '@testing-library/jest-dom';

globalThis.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };
globalThis.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
