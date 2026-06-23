import * as crypto from 'crypto';

export function getRandomPassword(): string {
    return `Test_${Date.now()}$`
}

export function getRandomEmail(): string {
    return `user_${Date.now()}@automation.com`;
}

/**
 * Generates a unique, time-related ID that is strictly 9 digits or fewer.
 * Fully stateless
 */
export function getRandomIdentificationNumber(): string {
    // Custom epoch: Jan 1, 2026. Shrinks the size of the timestamp.
    const CUSTOM_EPOCH = 1767225600000;

    const now = Date.now() - CUSTOM_EPOCH;

    // 1. Time component (5 digits): Current time in seconds.
    // Rolls over every ~27.7 hours (% 100000).
    const timePart = Math.floor(now / 1000) % 100000;

    // 2. Random component (4 digits): Cryptographically secure random number.
    // Generates a number from 0000 to 9999.
    const randomPart = crypto.randomInt(0, 10000);

    // 3. String padding ensures both parts retain their required digit lengths,
    // even if they happen to start with zeros (e.g., randomPart = 42 becomes "0042").
    const timeString = timePart.toString().padStart(5, '0');
    const randomString = randomPart.toString().padStart(4, '0');

    // Combine them into a guaranteed 9-character string
    return `${timeString}${randomString}`;
}

export function wait(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a random element from the provided array or `undefined` if empty.
 * Generic over the element type.
 */
export function getRandomElement<T>(list: ReadonlyArray<T>): T | undefined {
    if (!list || list.length === 0) return undefined;
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
}

