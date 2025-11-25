import { describe, expect, it, beforeEach } from 'vitest';
import HeaderStore from '../HeaderStore';

describe('HeaderStore', () => {
	beforeEach(() => {
		HeaderStore.reset();
	});

	it('should persist account id synchronously', () => {
		expect(HeaderStore.getAccountId()).toBeUndefined();
		HeaderStore.setAccountId('account-123');
		expect(HeaderStore.getAccountId()).toBe('account-123');
	});

	it('should handle tracing flag and badge scan', () => {
		expect(HeaderStore.isTracingEnabled()).toBe(false);
		HeaderStore.setTracingEnabled(true);
		HeaderStore.setBadgeScan('badge-42');

		expect(HeaderStore.isTracingEnabled()).toBe(true);
		expect(HeaderStore.getBadgeScan()).toBe('badge-42');

		HeaderStore.reset();
		expect(HeaderStore.isTracingEnabled()).toBe(false);
		expect(HeaderStore.getBadgeScan()).toBeUndefined();
	});
});

