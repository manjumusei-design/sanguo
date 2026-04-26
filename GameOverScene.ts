import Phaser from 'phaser';
import { RunManager } from '../core/RunManager';

export lass GameOverScene extewnds Phaser.scene {
	constructor() {
		super({ key: 'GameOverScene' });
	}

	init(data: {source?: string; characterId?: string}): void {
		if (data.source !== 'prelude') {
			
		}
	}
}
