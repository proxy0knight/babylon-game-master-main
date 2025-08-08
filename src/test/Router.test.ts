import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Router } from '../utils/Router';

describe('Router', () => {
  let router: Router;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    // Create a mock container element
    mockContainer = document.createElement('div');
    mockContainer.id = 'app';
    document.body.appendChild(mockContainer);

    // Create router instance
    router = new Router(mockContainer);

    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
      },
      writable: true,
    });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
        search: '',
        hash: '',
        href: 'http://localhost:3000/',
      },
      writable: true,
    });
  });

  afterEach(() => {
    document.body.removeChild(mockContainer);
  });

  it('should create router instance', () => {
    expect(router).toBeDefined();
    expect(router).toBeInstanceOf(Router);
  });

  it('should add routes correctly', () => {
    const mockHandler = vi.fn();
    
    router.addRoute('/', mockHandler);
    router.addRoute('/game', mockHandler);
    router.addRoute('/admin', mockHandler);

    // Access private routes property for testing
    const routes = (router as any).routes;
    expect(routes.size).toBe(3);
    expect(routes.has('/')).toBe(true);
    expect(routes.has('/game')).toBe(true);
    expect(routes.has('/admin')).toBe(true);
  });

  it('should navigate to route', () => {
    const mockHandler = vi.fn();
    router.addRoute('/test', mockHandler);

    router.navigate('/test');

    expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test');
    expect(mockHandler).toHaveBeenCalled();
  });

  it('should handle unknown routes', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    router.navigate('/unknown');

    expect(consoleSpy).toHaveBeenCalledWith('No route found for: /unknown');
    
    consoleSpy.mockRestore();
  });

  it('should handle popstate events', () => {
    const mockHandler = vi.fn();
    router.addRoute('/', mockHandler);

    // Simulate popstate event
    const popstateEvent = new PopStateEvent('popstate');
    window.dispatchEvent(popstateEvent);

    expect(mockHandler).toHaveBeenCalled();
  });

  it('should get current path', () => {
    const currentPath = router.getCurrentPath();
    expect(currentPath).toBe('/');
  });

  it('should handle route with parameters', () => {
    const mockHandler = vi.fn();
    router.addRoute('/user/:id', mockHandler);

    // Mock location for parameterized route
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/user/123',
        search: '',
        hash: '',
        href: 'http://localhost:3000/user/123',
      },
      writable: true,
    });

    router.navigate('/user/123');
    expect(mockHandler).toHaveBeenCalled();
  });
});

