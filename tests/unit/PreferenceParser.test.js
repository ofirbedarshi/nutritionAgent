"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unit tests for PreferenceParser
 */
const PreferenceParser_1 = require("../../src/modules/prefs/PreferenceParser");
describe('PreferenceParser', () => {
    let parser;
    beforeEach(() => {
        parser = new PreferenceParser_1.PreferenceParser();
    });
    describe('parsePreferenceCommand', () => {
        test('should parse goal commands', () => {
            expect(parser.parsePreferenceCommand('set goal: fat_loss')).toEqual({
                goal: 'fat_loss',
            });
            expect(parser.parsePreferenceCommand('set goal muscle_gain')).toEqual({
                goal: 'muscle_gain',
            });
            expect(parser.parsePreferenceCommand('SET GOAL: MAINTENANCE')).toEqual({
                goal: 'maintenance',
            });
            expect(parser.parsePreferenceCommand('set goal general')).toEqual({
                goal: 'general',
            });
        });
        test('should parse report time commands', () => {
            expect(parser.parsePreferenceCommand('report 21:30')).toEqual({
                reportTime: '21:30',
            });
            expect(parser.parsePreferenceCommand('REPORT 09:00')).toEqual({
                reportTime: '09:00',
            });
            expect(parser.parsePreferenceCommand('report 23:59')).toEqual({
                reportTime: '23:59',
            });
        });
        test('should reject invalid time formats', () => {
            expect(parser.parsePreferenceCommand('report 25:00')).toBeNull();
            expect(parser.parsePreferenceCommand('report 12:60')).toBeNull();
            expect(parser.parsePreferenceCommand('report abc')).toBeNull();
        });
        test('should parse tone commands', () => {
            expect(parser.parsePreferenceCommand('tone friendly')).toEqual({
                tone: 'friendly',
            });
            expect(parser.parsePreferenceCommand('TONE CLINICAL')).toEqual({
                tone: 'clinical',
            });
            expect(parser.parsePreferenceCommand('tone funny')).toEqual({
                tone: 'funny',
            });
        });
        test('should parse focus commands', () => {
            expect(parser.parsePreferenceCommand('focus protein, veggies')).toEqual({
                focus: ['protein', 'veggies'],
            });
            expect(parser.parsePreferenceCommand('FOCUS protein')).toEqual({
                focus: ['protein'],
            });
            expect(parser.parsePreferenceCommand('focus protein, carbs, fiber')).toEqual({
                focus: ['protein', 'carbs', 'fiber'],
            });
        });
        test('should parse store photos commands', () => {
            expect(parser.parsePreferenceCommand('store photos on')).toEqual({
                storeMedia: true,
            });
            expect(parser.parsePreferenceCommand('STORE PHOTO OFF')).toEqual({
                storeMedia: false,
            });
        });
        test('should return null for non-commands', () => {
            expect(parser.parsePreferenceCommand('grilled chicken and salad')).toBeNull();
            expect(parser.parsePreferenceCommand('hello world')).toBeNull();
            expect(parser.parsePreferenceCommand('')).toBeNull();
        });
        test('should return null for invalid commands', () => {
            expect(parser.parsePreferenceCommand('set goal invalid_goal')).toBeNull();
            expect(parser.parsePreferenceCommand('tone invalid_tone')).toBeNull();
            expect(parser.parsePreferenceCommand('invalid command')).toBeNull();
        });
    });
    describe('generateConfirmationMessage', () => {
        test('should generate goal confirmation messages', () => {
            expect(parser.generateConfirmationMessage({ goal: 'fat_loss' }))
                .toBe('✅ Goal set to: Fat Loss');
            expect(parser.generateConfirmationMessage({ goal: 'muscle_gain' }))
                .toBe('✅ Goal set to: Muscle Gain');
        });
        test('should generate report time confirmation messages', () => {
            expect(parser.generateConfirmationMessage({ reportTime: '21:30' }))
                .toBe('✅ Daily report time set to: 21:30');
        });
        test('should generate tone confirmation messages', () => {
            expect(parser.generateConfirmationMessage({ tone: 'friendly' }))
                .toBe('✅ Tone set to: Friendly');
            expect(parser.generateConfirmationMessage({ tone: 'clinical' }))
                .toBe('✅ Tone set to: Clinical');
        });
        test('should generate focus confirmation messages', () => {
            expect(parser.generateConfirmationMessage({ focus: ['protein', 'veggies'] }))
                .toBe('✅ Focus areas set to: protein, veggies');
        });
        test('should generate store media confirmation messages', () => {
            expect(parser.generateConfirmationMessage({ storeMedia: true }))
                .toBe('✅ Photo storage enabled');
            expect(parser.generateConfirmationMessage({ storeMedia: false }))
                .toBe('✅ Photo storage disabled');
        });
    });
});
//# sourceMappingURL=PreferenceParser.test.js.map