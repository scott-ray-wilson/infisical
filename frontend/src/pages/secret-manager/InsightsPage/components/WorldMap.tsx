import { useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";

import {
  Badge,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  UnstableCard,
  UnstableCardContent,
  UnstableCardDescription,
  UnstableCardHeader,
  UnstableCardTitle
} from "@app/components/v3";
import { useProject } from "@app/context";
import { useGetSecretAccessLocations } from "@app/hooks/api";
import { TAccessLocation } from "@app/hooks/api/secretInsights/types";

// Bundled locally to avoid CSP issues with external fetch
// Source: https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json
import worldTopoJson from "./countries-110m.json";

// ISO 3166-1 alpha-2 → numeric mapping (covers common countries; extend as needed)
/* eslint-disable @typescript-eslint/naming-convention */
const ALPHA2_TO_NUMERIC: Record<string, string> = {
  AF: "004",
  AL: "008",
  DZ: "012",
  AR: "032",
  AU: "036",
  AT: "040",
  BD: "050",
  BE: "056",
  BR: "076",
  BG: "100",
  CA: "124",
  CL: "152",
  CN: "156",
  CO: "170",
  HR: "191",
  CZ: "203",
  DK: "208",
  EG: "818",
  EE: "233",
  FI: "246",
  FR: "250",
  DE: "276",
  GR: "300",
  HK: "344",
  HU: "348",
  IN: "356",
  ID: "360",
  IR: "364",
  IQ: "368",
  IE: "372",
  IL: "376",
  IT: "380",
  JP: "392",
  KE: "404",
  KR: "410",
  LV: "428",
  LT: "440",
  MY: "458",
  MX: "484",
  MA: "504",
  NL: "528",
  NZ: "554",
  NG: "566",
  NO: "578",
  PK: "586",
  PE: "604",
  PH: "608",
  PL: "616",
  PT: "620",
  RO: "642",
  RU: "643",
  SA: "682",
  SG: "702",
  ZA: "710",
  ES: "724",
  SE: "752",
  CH: "756",
  TW: "158",
  TH: "764",
  TR: "792",
  UA: "804",
  AE: "784",
  GB: "826",
  US: "840",
  VN: "704",
  KZ: "398",
  CY: "196"
};
/* eslint-enable @typescript-eslint/naming-convention */

const MAX_RADIUS = 14;
const MIN_RADIUS = 4;

// Natural Earth 1 projection fitted to a viewBox — fully responsive, never clips
const SVG_WIDTH = 960;
const SVG_HEIGHT = 500;

const projection = geoNaturalEarth1()
  .scale(155)
  .translate([SVG_WIDTH / 2, SVG_HEIGHT / 2]);

const pathGenerator = geoPath(projection);

const geoFeatures = (
  feature(
    worldTopoJson as unknown as Topology,
    (worldTopoJson as unknown as Topology).objects.countries
  ) as GeoJSON.FeatureCollection
).features;

const ResponsiveWorldMap = ({
  mapLocations,
  countryActivity,
  getCountryFill,
  getRadius
}: {
  mapLocations: TAccessLocation[];
  countryActivity: Map<string, number>;
  getCountryFill: (geoId: string) => string;
  getRadius: (count: number) => number;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const getHoverFill = (id: string) => {
    if (countryActivity.has(id)) {
      return "color-mix(in srgb, var(--color-info) 70%, var(--color-mineshaft-800))";
    }
    return "var(--color-mineshaft-700)";
  };

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className="w-full rounded-md border border-border bg-container shadow-inner"
      >
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <g>
            {geoFeatures.map((geo) => {
              const id = String(geo.id ?? "");
              const d = pathGenerator(geo) ?? "";
              return (
                <path
                  key={id}
                  d={d}
                  fill={hovered === id ? getHoverFill(id) : getCountryFill(id)}
                  stroke="var(--color-mineshaft-600)"
                  strokeWidth={0.5}
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ outline: "none", transition: "fill 0.15s" }}
                />
              );
            })}
          </g>
          <g>
            {mapLocations.map((loc) => {
              const coords = projection([loc.lng, loc.lat]);
              if (!coords) return null;
              return (
                <Tooltip key={`${loc.city}:${loc.country}`}>
                  <TooltipTrigger asChild>
                    <circle
                      cx={coords[0]}
                      cy={coords[1]}
                      r={getRadius(loc.count)}
                      fill="color-mix(in srgb, var(--color-warning) 50%, transparent)"
                      stroke="var(--color-warning)"
                      strokeWidth={1.5}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">
                      {loc.city}, {loc.country}
                    </p>
                    <p className="text-xs text-muted">
                      {loc.count.toLocaleString()} access{loc.count !== 1 ? "es" : ""}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </g>
        </svg>
      </div>
    </TooltipProvider>
  );
};

export const WorldMap = () => {
  const { projectId } = useProject();

  const { data, isPending } = useGetSecretAccessLocations(
    { projectId, days: 30 },
    { enabled: !!projectId }
  );

  const allLocations = data?.locations ?? [];

  // Separate local network entries from geo-resolvable locations
  const { mapLocations, localCount } = useMemo(() => {
    const geo: TAccessLocation[] = [];
    let local = 0;
    allLocations.forEach((loc) => {
      if (loc.country === "LOCAL") {
        local += loc.count;
      } else {
        geo.push(loc);
      }
    });
    return { mapLocations: geo, localCount: local };
  }, [allLocations]);

  // Aggregate total access count per country (numeric code) for choropleth fill
  const { countryActivity, countryMaxCount } = useMemo(() => {
    const activity = new Map<string, number>();
    mapLocations.forEach((loc) => {
      const numericCode = ALPHA2_TO_NUMERIC[loc.country];
      if (!numericCode) return;
      activity.set(numericCode, (activity.get(numericCode) || 0) + loc.count);
    });
    const maxVal = Math.max(...Array.from(activity.values()), 1);
    return { countryActivity: activity, countryMaxCount: maxVal };
  }, [mapLocations]);

  const maxCount = useMemo(() => Math.max(...mapLocations.map((l) => l.count), 1), [mapLocations]);

  const getRadius = (count: number) => {
    const ratio = count / maxCount;
    return MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS);
  };

  const getCountryFill = (geoId: string) => {
    const count = countryActivity.get(geoId);
    if (!count) return "var(--color-mineshaft-800)";
    // Scale intensity from 15% to 60% based on relative activity
    const intensity = Math.round(15 + (count / countryMaxCount) * 45);
    return `color-mix(in srgb, var(--color-info) ${intensity}%, var(--color-mineshaft-800))`;
  };

  const totalAccess = allLocations.reduce((sum, l) => sum + l.count, 0);

  return (
    <UnstableCard className="mt-6">
      <UnstableCardHeader>
        <UnstableCardTitle>Secret Access Locations</UnstableCardTitle>
        <UnstableCardDescription>
          Geographic distribution of secret access over the past 30 days
        </UnstableCardDescription>
      </UnstableCardHeader>
      <UnstableCardContent>
        {isPending ? (
          <Skeleton className="h-[350px] w-full" />
        ) : (
          <>
            <ResponsiveWorldMap
              mapLocations={mapLocations}
              countryActivity={countryActivity}
              getCountryFill={getCountryFill}
              getRadius={getRadius}
            />
            {totalAccess > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                {mapLocations.map((loc) => (
                  <span key={`${loc.city}:${loc.country}`} className="text-foreground">
                    <span className="text-label">
                      {loc.city}, {loc.country}:
                    </span>{" "}
                    {loc.count.toLocaleString()}
                  </span>
                ))}
                {localCount > 0 && (
                  <span className="text-foreground">
                    <Badge variant="neutral" className="mr-1">
                      Local Network
                    </Badge>
                    {localCount.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </UnstableCardContent>
    </UnstableCard>
  );
};
