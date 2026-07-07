import * as crypto from 'crypto';
import { DateTime } from 'luxon';

export function getRandomPassword(): string {
    return [
        'T', // uppercase
        'e', // lowercase
        '1', // number
        '!', // special
        crypto.randomUUID().replace(/-/g, '').slice(0, 8), // random string
    ].join('');
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
    const timeString = timePart.toString().padStart(4, '0');
    const randomString = randomPart.toString().padStart(4, '0');

    // Combine them into a guaranteed 9-character string
    return `1${timeString}${randomString}`;
}

export function wait(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
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

/**
 * Executes an async function with exponential backoff retry logic.
 * Retries the function if it fails and the shouldRetry predicate returns true.
 *
 * @param fn - The async function to execute
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelayMs - Initial delay in milliseconds (default: 100)
 * @param shouldRetry - Optional predicate to determine if an error should trigger a retry (default: () => true)
 * @returns The result of the function or throws after all retries exhausted
 *
 * @example
 * await retryWithExponentialBackoff(
 *   () => apiClient.get('/some-endpoint'),
 *   3,
 *   100,
 *   (error) => error.statusCode >= 500 // Only retry on 5xx errors
 * );
 */
export async function retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 100,
    shouldRetry: (error: any, attempt: number) => boolean = () => true,
): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // If this was the last attempt or shouldRetry returns false, throw immediately
            if (attempt === maxRetries || !shouldRetry(error, attempt)) {
                throw error;
            }

            // Calculate exponential backoff delay: 100ms * 2^attempt
            const delayMs = initialDelayMs * Math.pow(2, attempt);
            console.debug(`Retry attempt ${attempt + 1} of ${maxRetries} in ${delayMs}ms...`);
            await wait(delayMs);
        }
    }

    throw lastError;
}

export function getPetAge(birthDate: DateTime): string {
    const now = DateTime.now();

    const years = Math.floor(now.diff(birthDate, 'years').years);

    if (years >= 1) {
        return `${years} Año${years > 1 ? 's' : ''}`;
    }

    const months = Math.floor(now.diff(birthDate, 'months').months);

    return `${months} Mes${months !== 1 ? 'es' : ''}`;
}
