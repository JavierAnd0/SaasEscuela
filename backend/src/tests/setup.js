'use strict';

// Silencia logs de consola durante los tests para output limpio
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
