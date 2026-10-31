import { z } from 'zod';

// ─── Enum schemas ──────────────────────────────────────────────────────────────

export const ZoneHygieneClassSchema = z.enum([
  'RAW',
  'LOW_RISK',
  'HIGH_CARE',
  'PACKAGING',
  'STORAGE',
  'NON_FOOD',
]);
export type ZoneHygieneClass = z.infer<typeof ZoneHygieneClassSchema>;

export const ControlTypeSchema = z.enum(['CCP', 'CP', 'PRP']);
export type ControlType = z.infer<typeof ControlTypeSchema>;

export const StepTypeSchema = z.enum([
  'MATERIAL_INPUT',
  'PROCESS_ACTION',
  'CCP',
  'CP',
  'PRP',
  'PACKAGING',
  'OUTPUT',
]);
export type StepType = z.infer<typeof StepTypeSchema>;

// ─── Sub-schemas ───────────────────────────────────────────────────────────────

export const AllergenSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
});
export type Allergen = z.infer<typeof AllergenSchema>;

export const ZoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().optional(),
  hygieneClass: ZoneHygieneClassSchema,
  x: z.number(),
  z: z.number(),
  width: z.number().positive(),
  depth: z.number().positive(),
  allergenCodes: z.array(z.string()),
});
export type Zone = z.infer<typeof ZoneSchema>;

export const StationFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  monitoringFrequency: z.string().optional(),
  correctiveActionText: z.string().optional(),
});
export type StationField = z.infer<typeof StationFieldSchema>;

export const StationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().optional(),
  controlType: ControlTypeSchema,
  position: z.object({
    x: z.number(),
    z: z.number(),
    rotationY: z.number().optional(),
  }),
  zoneId: z.string().optional(),
  fields: z.array(StationFieldSchema),
  externalRef: z
    .object({
      system: z.literal('asadra'),
      stationId: z.string(),
    })
    .optional(),
});
export type Station = z.infer<typeof StationSchema>;

export const ProcessStepSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: StepTypeSchema,
  sortOrder: z.number().int(),
  stationId: z.string().optional(),
  position: z
    .object({
      x: z.number(),
      z: z.number(),
    })
    .optional(),
});
export type ProcessStep = z.infer<typeof ProcessStepSchema>;

export const ProcessEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});
export type ProcessEdge = z.infer<typeof ProcessEdgeSchema>;

export const ProcessSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  steps: z.array(ProcessStepSchema),
  edges: z.array(ProcessEdgeSchema),
});
export type Process = z.infer<typeof ProcessSchema>;

export const ReadingSchema = z.object({
  id: z.string().min(1),
  stationId: z.string().min(1),
  recordedAt: z.string().datetime(),
  values: z.record(z.string(), z.number()),
  correctiveAction: z.string().optional(),
  hash: z.string().optional(),
  prevHash: z.string().optional(),
});
export type Reading = z.infer<typeof ReadingSchema>;

export const SiteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().optional(),
  widthM: z.number().positive(),
  depthM: z.number().positive(),
  tenantRef: z.string().optional(),
});
export type Site = z.infer<typeof SiteSchema>;

// ─── Top-level TwinDataset ─────────────────────────────────────────────────────

export const TwinDatasetSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: z.object({
      kind: z.enum(['seed', 'asadra-export', 'manual']),
      exportedAt: z.string().optional(),
    }),
    site: SiteSchema,
    allergens: z.array(AllergenSchema),
    zones: z.array(ZoneSchema),
    stations: z.array(StationSchema),
    process: ProcessSchema,
    readings: z.array(ReadingSchema),
  })
  .superRefine((data, ctx) => {
    const allergenCodes = new Set(data.allergens.map((a) => a.code));
    const zoneIds = new Set(data.zones.map((z) => z.id));
    const stationIds = new Set(data.stations.map((s) => s.id));
    const stepIds = new Set(data.process.steps.map((s) => s.id));

    // Validate zone allergenCodes reference known allergens
    for (const zone of data.zones) {
      for (const code of zone.allergenCodes) {
        if (!allergenCodes.has(code)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Zone "${zone.id}" references unknown allergen code "${code}"`,
            path: ['zones'],
          });
        }
      }
    }

    // Validate station zoneId references a known zone
    for (const station of data.stations) {
      if (station.zoneId && !zoneIds.has(station.zoneId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Station "${station.id}" references unknown zoneId "${station.zoneId}"`,
          path: ['stations'],
        });
      }
    }

    // Validate process step stationId references a known station
    for (const step of data.process.steps) {
      if (step.stationId && !stationIds.has(step.stationId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Step "${step.id}" references unknown stationId "${step.stationId}"`,
          path: ['process', 'steps'],
        });
      }
    }

    // Validate edge endpoints reference known step ids
    for (const edge of data.process.edges) {
      if (!stepIds.has(edge.from)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge from "${edge.from}" references unknown step`,
          path: ['process', 'edges'],
        });
      }
      if (!stepIds.has(edge.to)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge to "${edge.to}" references unknown step`,
          path: ['process', 'edges'],
        });
      }
    }

    // Validate reading stationId references a known station
    for (const reading of data.readings) {
      if (!stationIds.has(reading.stationId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Reading "${reading.id}" references unknown stationId "${reading.stationId}"`,
          path: ['readings'],
        });
      }
    }

    // Validate step sortOrder is unique
    const sortOrders = data.process.steps.map((s) => s.sortOrder);
    const uniqueSortOrders = new Set(sortOrders);
    if (uniqueSortOrders.size !== sortOrders.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Process step sortOrder values must be unique',
        path: ['process', 'steps'],
      });
    }
  });

export type TwinDataset = z.infer<typeof TwinDatasetSchema>;
