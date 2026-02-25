import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Model cache interface
export interface ModelCacheItem {
  model: GLTF;
  timestamp: number;
}

// Model cache class
export class ModelCache {
  private cache: Map<string, ModelCacheItem>;
  private maxAge: number; // Max age in milliseconds before cache item is considered stale

  constructor(maxAge: number = 3600000) { // Default max age: 1 hour
    this.cache = new Map();
    this.maxAge = maxAge;
  }

  // Get a model from cache
  get(url: string): GLTF | null {
    const item = this.cache.get(url);
    if (!item) return null;

    // Check if item is stale
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(url);
      return null;
    }

    return item.model;
  }

  // Set a model in cache
  set(url: string, model: GLTF): void {
    this.cache.set(url, {
      model,
      timestamp: Date.now()
    });
  }

  // Delete a model from cache
  delete(url: string): void {
    this.cache.delete(url);
  }

  // Clear the entire cache
  clear(): void {
    this.cache.clear();
  }

  // Get the size of the cache
  size(): number {
    return this.cache.size;
  }
}

// Create a singleton instance of ModelCache
export const modelCache = new ModelCache();
