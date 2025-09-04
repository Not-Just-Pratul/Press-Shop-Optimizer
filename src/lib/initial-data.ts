
import type { Part, Machine } from "./types";

export const initialParts: Part[] = [
  {
    id: "p1",
    partName: "Engine Mount Bracket",
    partDescription: "340N",
    operations: [
      { stepName: "1 Drawing", lowestPress: "Press-75T", dieSettingTime: 10, timeFor50Pcs: 15 },
      { stepName: "2 Drawing", lowestPress: "Press-50T", dieSettingTime: 5, timeFor50Pcs: 10 },
      { stepName: "Trimming", lowestPress: "Press-50T", dieSettingTime: 5, timeFor50Pcs: 8 },
      { stepName: "Punching", lowestPress: "Press-50T", dieSettingTime: 5, timeFor50Pcs: 7 },
      { stepName: "Bending", lowestPress: "Press-30T", dieSettingTime: 5, timeFor50Pcs: 5 },
    ],
    priority: 1,
  },
  {
    id: "p2",
    partName: "Side Panel Reinforcement",
    partDescription: "70N",
    operations: [
      { stepName: "Blanking", lowestPress: "Press-75T", dieSettingTime: 10, timeFor50Pcs: 10 },
      { stepName: "Drawing", lowestPress: "Press-75T", dieSettingTime: 5, timeFor50Pcs: 10 },
      { stepName: "1 Punching", lowestPress: "Press-50T", dieSettingTime: 5, timeFor50Pcs: 8 },
      { stepName: "2 Punching", lowestPress: "Press-50T", dieSettingTime: 5, timeFor50Pcs: 7 },
    ],
    priority: 2,
  },
  {
    id: "p3",
    partName: "Cross Member",
    partDescription: "110+180N",
    operations: [
        { stepName: "Blanking", lowestPress: "Press-50T", dieSettingTime: 8, timeFor50Pcs: 10 },
        { stepName: "Punching", lowestPress: "Press-30T", dieSettingTime: 7, timeFor50Pcs: 10 },
        { stepName: "Bending", lowestPress: "Press-20T", dieSettingTime: 5, timeFor50Pcs: 10 },
    ],
    priority: 3,
  },
  {
    id: "p4",
    partName: "Floor Pan Support",
    partDescription: "108N",
    operations: [
        { stepName: "Blanking", lowestPress: "Press-75T", dieSettingTime: 10, timeFor50Pcs: 15 },
        { stepName: "Draw", lowestPress: "Press-50T", dieSettingTime: 8, timeFor50Pcs: 15 },
        { stepName: "Punching", lowestPress: "Press-30T", dieSettingTime: 7, timeFor50Pcs: 10 },
    ],
    priority: 4,
  },
  {
    id: "p5",
    partName: "A-Pillar Stiffener",
    partDescription: "100N",
    operations: [
        { stepName: "Blanking", lowestPress: "Press-160T", dieSettingTime: 10, timeFor50Pcs: 15 },
        { stepName: "1 Draw", lowestPress: "Press-30T", dieSettingTime: 5, timeFor50Pcs: 10 },
        { stepName: "2 Draw", lowestPress: "Press-75T", dieSettingTime: 5, timeFor50Pcs: 10 },
        { stepName: "Punching", lowestPress: "Press-30T", dieSettingTime: 5, timeFor50Pcs: 5 },
    ],
    priority: 5,
  },
  {
    id: "p6",
    partName: "Base Plate",
    partDescription: "130N Base Plate",
    operations: [
        { stepName: "Blanking", lowestPress: "Press-75T", dieSettingTime: 10, timeFor50Pcs: 15 },
        { stepName: "Bending", lowestPress: "Press-30T", dieSettingTime: 5, timeFor50Pcs: 10 },
    ],
    priority: 6,
  },
  {
    id: "p7",
    partName: "Roof Bow",
    partDescription: "430N",
    operations: [
        { stepName: "Blanking", lowestPress: "Press-160T", dieSettingTime: 10, timeFor50Pcs: 18 },
        { stepName: "Drawing", lowestPress: "Press-75T", dieSettingTime: 8, timeFor50Pcs: 12 },
        { stepName: "Punching", lowestPress: "Press-50T", dieSettingTime: 7, timeFor50Pcs: 10 },
    ],
    priority: 7,
  },
  {
    id: "p8",
    partName: "B-Pillar Reinforcement",
    partDescription: "130N",
    operations: [
        { stepName: "Blanking", lowestPress: "Press-160T", dieSettingTime: 10, timeFor50Pcs: 15 },
        { stepName: "1 Bending", lowestPress: "Press-50T", dieSettingTime: 5, timeFor50Pcs: 8 },
        { stepName: "2 Bending", lowestPress: "Press-75T", dieSettingTime: 5, timeFor50Pcs: 8 },
        { stepName: "3 Bending", lowestPress: "Press-50T", dieSettingTime: 5, timeFor50Pcs: 8 },
        { stepName: "1 Punching", lowestPress: "Press-50T", dieSettingTime: 5, timeFor50Pcs: 6 },
        { stepName: "2 Punching", lowestPress: "Press-20T", dieSettingTime: 5, timeFor50Pcs: 5 },
    ],
    priority: 8,
  },
  {
    id: "p9",
    partName: "Door Impact Beam",
    partDescription: "330N",
    operations: [
        { stepName: "Blanking", lowestPress: "Press-75T", dieSettingTime: 8, timeFor50Pcs: 12 },
        { stepName: "Bending", lowestPress: "Press-50T", dieSettingTime: 7, timeFor50Pcs: 10 },
        { stepName: "Punching", lowestPress: "Press-30T", dieSettingTime: 5, timeFor50Pcs: 8 },
    ],
    priority: 9,
  },
  {
    id: "p10",
    partName: "Small Bracket",
    partDescription: "90N",
    operations: [
      { stepName: "Blanking", lowestPress: "Press-20T", dieSettingTime: 10, timeFor50Pcs: 15 },
      { stepName: "Punching", lowestPress: "Press-10T", dieSettingTime: 10, timeFor50Pcs: 15 },
    ],
    priority: 10,
  },
  {
    id: "p11",
    partName: "Hinge Plate",
    partDescription: "2810",
    operations: [
        { stepName: "Blanking", lowestPress: "Press-20T", dieSettingTime: 8, timeFor50Pcs: 13 },
        { stepName: "Bending", lowestPress: "Press-10T", dieSettingTime: 7, timeFor50Pcs: 12 },
    ],
    priority: 11,
  },
];

export const initialMachines: Machine[] = [
  { id: "m1", machineName: "Press-10T", capacity: 10, available: true, downtimeDuration: 0 },
  { id: "m2", machineName: "Press-20T", capacity: 20, available: true, downtimeDuration: 0 },
  { id: "m3", machineName: "Press-30T", capacity: 30, available: true, downtimeDuration: 0 },
  { id: "m4", machineName: "Press-30T-2", capacity: 30, available: true, downtimeDuration: 0 },
  { id: "m5", machineName: "Press-50T", capacity: 50, available: true, downtimeDuration: 0 },
  { id: "m6", machineName: "Press-50T-2", capacity: 50, available: true, downtimeDuration: 0 },
  { id: "m7", machineName: "Press-75T", capacity: 75, available: true, downtimeDuration: 0 },
  { id: "m8", machineName: "Press-75T-2", capacity: 75, available: true, downtimeDuration: 0 },
  { id: "m9", machineName: "Press-100T", capacity: 100, available: true, downtimeDuration: 0 },
  { id: "m10", machineName: "Press-150T", capacity: 150, available: true, downtimeDuration: 0 },
  { id: "m11", machineName: "Press-200T", capacity: 200, available: true, downtimeDuration: 0 },
  { id: "m12", machineName: "Press-250T", capacity: 250, available: true, downtimeDuration: 0 },
  { id: "m13", machineName: "Press-300T", capacity: 300, available: true, downtimeDuration: 0 },
];
