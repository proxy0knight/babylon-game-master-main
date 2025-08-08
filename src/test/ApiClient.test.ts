import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from '../utils/ApiClient';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient('http://localhost:5001/api');
    mockFetch.mockClear();
  });

  describe('saveAsset', () => {
    it('should save asset successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Asset saved successfully',
        filename: 'test-map.json',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.saveAsset('map', 'test-map', 'const scene = createScene();');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5001/api/assets/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'map',
          name: 'test-map',
          code: 'const scene = createScene();',
        }),
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle save asset error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(apiClient.saveAsset('map', 'test-map', 'code')).rejects.toThrow(
        'HTTP error! status: 500'
      );
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.saveAsset('map', 'test-map', 'code')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('loadAsset', () => {
    it('should load asset successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          name: 'test-map',
          code: 'const scene = createScene();',
          type: 'map',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.loadAsset('map', 'test-map');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5001/api/assets/load/map/test-map');
      expect(result).toEqual(mockResponse);
    });

    it('should handle load asset error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(apiClient.loadAsset('map', 'test-map')).rejects.toThrow(
        'HTTP error! status: 404'
      );
    });
  });

  describe('listAssets', () => {
    it('should list assets successfully', async () => {
      const mockResponse = {
        success: true,
        data: ['map1.json', 'map2.json', 'map3.json'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.listAssets('map');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5001/api/assets/list/map');
      expect(result).toEqual(mockResponse);
    });

    it('should handle list assets error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(apiClient.listAssets('map')).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('constructor', () => {
    it('should use default base URL if none provided', () => {
      const defaultClient = new ApiClient();
      expect((defaultClient as any).baseUrl).toBe('http://localhost:5001/api');
    });

    it('should use provided base URL', () => {
      const customClient = new ApiClient('http://example.com/api');
      expect((customClient as any).baseUrl).toBe('http://example.com/api');
    });
  });

  describe('error handling', () => {
    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(apiClient.loadAsset('map', 'test-map')).rejects.toThrow('Invalid JSON');
    });

    it('should handle fetch timeout', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 100);
          })
      );

      await expect(apiClient.loadAsset('map', 'test-map')).rejects.toThrow('Timeout');
    });
  });
});

