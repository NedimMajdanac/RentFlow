import { PropertyRequest } from '../../property.models';
import { PropertyDraft } from '../property-draft.service';

/** Names of the wizard steps whose required data is missing from the draft (empty = ready to save). */
export function missingForProperty(d: PropertyDraft): string[] {
  const missing: string[] = [];
  if (!d.propertyType || !d.address) missing.push('Osnovne informacije (korak 1)');
  if (d.cityId === null) missing.push('Lokacija (korak 2)');
  if (d.areaM2 === null) missing.push('Karakteristike (korak 3)');
  return missing;
}

/** Maps the draft to the body of POST/PUT /api/properties. Call only when nothing is missing. */
export function buildPropertyRequest(d: PropertyDraft): PropertyRequest {
  return {
    cityId: d.cityId!,
    propertyType: d.propertyType!,
    address: d.address,
    description: d.description || null,
    areaM2: d.areaM2!,
    plotAreaM2: d.plotAreaM2,
    rooms: d.rooms,
    bathrooms: d.bathrooms,
    floor: d.floor,
    totalFloors: d.totalFloors,
    yearBuilt: d.yearBuilt,
    heatingType: d.heatingType,
    furnishedStatus: d.furnishedStatus,
    condition: d.condition,
    latitude: d.latitude,
    longitude: d.longitude,
    amenityIds: d.amenityIds,
  };
}