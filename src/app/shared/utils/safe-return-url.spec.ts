import { getSafeReturnUrl } from './safe-return-url';

describe('getSafeReturnUrl', () => {
  it('preserves local paths, queries and fragments', () => {
    expect(getSafeReturnUrl('/products/abc/edit?tab=owner#form')).toBe(
      '/products/abc/edit?tab=owner#form',
    );
  });

  it('rejects external, malformed and login-loop destinations', () => {
    expect(getSafeReturnUrl('//external.example/path')).toBe('/persons');
    expect(getSafeReturnUrl('/\\external.example/path')).toBe('/persons');
    expect(getSafeReturnUrl('https://external.example/path')).toBe('/persons');
    expect(getSafeReturnUrl('/login?returnUrl=/login')).toBe('/persons');
    expect(getSafeReturnUrl('/login/')).toBe('/persons');
    expect(getSafeReturnUrl('/login;source=guard')).toBe('/persons');
    expect(getSafeReturnUrl('/%6Cogin')).toBe('/persons');
    expect(getSafeReturnUrl(null)).toBe('/persons');
  });
});
