import type { CharacterClass } from '../types';

import warriorIdle from '../assets/characters/warrior/idle.png';
import warriorRun from '../assets/characters/warrior/run.png';
import warriorAttack from '../assets/characters/warrior/attack.png';

import mageIdle from '../assets/characters/mage/idle.png';
import mageRun from '../assets/characters/mage/run.png';
import mageAttack from '../assets/characters/mage/attack.png';

import assassinIdle from '../assets/characters/assassin/idle.png';
import assassinRun from '../assets/characters/assassin/run.png';
import assassinAttack from '../assets/characters/assassin/attack.png';

import archerIdle from '../assets/characters/archer/idle.png';
import archerRun from '../assets/characters/archer/run.png';
import archerAttack from '../assets/characters/archer/attack.png';

import reaperIdle from '../assets/characters/reaper/idle.png';
import reaperRun from '../assets/characters/reaper/run.png';
import reaperAttack from '../assets/characters/reaper/attack.png';

export const CHARACTERS: CharacterClass[] = [
  {
    id: 'warrior',
    name: 'Воин',
    nameAccusative: 'Воина',
    title: 'Крепкий боец с мечом и щитом',
    baseHealth: 140,
    baseDamage: 16,
    accentColor: 0xd1495b,
    attackRange: 62,
    animations: {
      idle: { src: warriorIdle, frameWidth: 96, frameHeight: 64, frameCount: 5, fps: 6, bottomPadding: 16 },
      run: { src: warriorRun, frameWidth: 96, frameHeight: 64, frameCount: 7, fps: 12, bottomPadding: 16 },
      attack: { src: warriorAttack, frameWidth: 96, frameHeight: 64, frameCount: 5, fps: 14, bottomPadding: 16 },
    },
  },
  {
    id: 'mage',
    name: 'Маг',
    nameAccusative: 'Мага',
    title: 'Владеет стихийной магией',
    baseHealth: 90,
    baseDamage: 22,
    accentColor: 0x2a9d8f,
    attackRange: 240,
    rangedAttack: 'ice',
    animations: {
      idle: { src: mageIdle, frameWidth: 96, frameHeight: 64, frameCount: 5, fps: 6, bottomPadding: 13 },
      run: { src: mageRun, frameWidth: 96, frameHeight: 64, frameCount: 8, fps: 12, bottomPadding: 12 },
      attack: {
        src: mageAttack,
        frameWidth: 96,
        frameHeight: 64,
        frameCount: 7,
        fps: 14,
        bottomPadding: 13,
        hitFrame: 3,
      },
    },
  },
  {
    id: 'assassin',
    name: 'Ассасин',
    nameAccusative: 'Ассасина',
    title: 'Бесшумен и смертоносен',
    baseHealth: 100,
    baseDamage: 20,
    accentColor: 0x6c3fa8,
    attackRange: 62,
    animations: {
      idle: { src: assassinIdle, frameWidth: 96, frameHeight: 96, frameCount: 5, fps: 6, bottomPadding: 30 },
      run: { src: assassinRun, frameWidth: 96, frameHeight: 96, frameCount: 8, fps: 12, bottomPadding: 30 },
      attack: { src: assassinAttack, frameWidth: 96, frameHeight: 96, frameCount: 6, fps: 14, bottomPadding: 30 },
    },
  },
  {
    id: 'archer',
    name: 'Лучник',
    nameAccusative: 'Лучника',
    title: 'Разит цели издалека',
    baseHealth: 110,
    baseDamage: 15,
    accentColor: 0xb3542c,
    attackRange: 260,
    rangedAttack: 'arrow',
    animations: {
      idle: { src: archerIdle, frameWidth: 96, frameHeight: 80, frameCount: 14, fps: 8, bottomPadding: 16 },
      run: { src: archerRun, frameWidth: 96, frameHeight: 80, frameCount: 8, fps: 12, bottomPadding: 16 },
      attack: {
        src: archerAttack,
        frameWidth: 96,
        frameHeight: 80,
        frameCount: 11,
        fps: 16,
        bottomPadding: 16,
        hitFrame: 7,
      },
    },
  },
  {
    id: 'reaper',
    name: 'Жнец',
    nameAccusative: 'Жнеца',
    title: 'Пылающий клинок, несущий гибель',
    baseHealth: 130,
    baseDamage: 19,
    accentColor: 0xa11d33,
    attackRange: 62,
    animations: {
      idle: { src: reaperIdle, frameWidth: 128, frameHeight: 108, frameCount: 6, fps: 6, bottomPadding: 12 },
      run: { src: reaperRun, frameWidth: 128, frameHeight: 108, frameCount: 8, fps: 12, bottomPadding: 6 },
      attack: { src: reaperAttack, frameWidth: 128, frameHeight: 108, frameCount: 6, fps: 14, bottomPadding: 12 },
    },
  },
];
