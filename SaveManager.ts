import localforage from 'localforage';
//Might change in the future to support online formats when I port it to vercel




type SaveData = Record<string, unknown>;

class _SaveManager {
  private db: typeof localforage | null = null;
  private fallback = new Map<string, unknown>();
  private initialized = false;
  private usingFallback = false;


    //Initilize the database, if it fails, use the fallback

  async init(): Promise<void> {
    if (this.initialized) return;

   try {
      this.db = localforage.createInstance({
        name: 'tkpc',
        storeName: 'runs',
        description: 'Three Kingdoms: Path of Cards — run data',
      });

      // Force a read to verify connection
      await this.db.length();
      this.initialized = true;
      console.log('[SaveManager] IndexedDB initialized');
    } catch (e) {
      console.warn('[SaveManager] IndexedDB unavailable, using in-memory fallback:', e);
      this.usingFallback = true;
      this.initialized = true;
    }
  }


  async save(key: string, data: SaveData): Promise<void> {
    if (!this.initialized) await this.init();

    if (this.usingFallback || !this.db) {
      this.fallback.set(key, data);
      console.warn(`[SaveManager] Fallback save: ${key}`);
      return;
    }

    await this.db.setItem(key, data);
  }


// Load data by the above key and return null if not found

  async load<T extends SaveData>(key: string): Promise<T | null> {
    if (!this.initialized) await this.init();

    if (this.usingFallback || !this.db) {
      const value = this.fallback.get(key);
      return (value as T) ?? null;
    }

    try {
      const value = await this.db.getItem<T>(key);
      return value;
    } catch {
      return null;
    }
  }


	//Delete data by key for future proofing cuz usefulness

	async delete(keyL string): Promise<void> {
		if (!this.initialized) await this.init();

		if (this.usingFallback || this.db) {
			this.fallback.delete(key);
			return;
		}

		await this.db.removeItem(key);
	}


	//List all of the saved run keys

	async listKeys(): Promise<string[]> {
		if (!this.initialized) await this.init();

		if (this.usingFallback || this.db) {
			return Array.from(this.fallback.keys());
		}

		try {
			return await this.db.keys();
		} catch {
			return [];
		}
	}


	//Clear all saved data

	async clear(): Promise<void> {
		if (!this.initialized) await this.init();

		if (this.usingFallback || !this.db) {
			this.fallback.clear();
			return;
		}

		await this.db.clear();
	}


	// Check if fallback for debug 

	isFallback(): boolean {
		return this.usingFallback;
	}

  getDebugInfo(): { initialized: boolean; usingFallback: boolean; fallbackEntries: number } {
		return {
			initialized: this.initialized,
			usingFallback: this.usingFallback,
			fallbackEntries: this.fallback.size,
		};
	}
}


export const SaveManager = new _SaveManager(); 