import { PropertyType } from '../property.models';

export type PropertyField =
  | 'areaM2' | 'plotAreaM2' | 'rooms' | 'bathrooms' | 'floor' | 'totalFloors' | 'yearBuilt'
  | 'heatingType' | 'furnishedStatus' | 'condition';
export type FieldRule = 'hidden' | 'optional' | 'required';

/** Mirrors PropertyMapper on the backend: fields that make no sense for a type are cleared there. */
export const FIELD_RULES: Record<PropertyType, Record<PropertyField, FieldRule>> = {
  Apartment: { areaM2: 'required', plotAreaM2: 'hidden', rooms: 'required', bathrooms: 'required', floor: 'required', totalFloors: 'required', yearBuilt: 'optional', heatingType: 'required', furnishedStatus: 'required', condition: 'required' },
  House: { areaM2: 'required', plotAreaM2: 'optional', rooms: 'required', bathrooms: 'required', floor: 'hidden', totalFloors: 'optional', yearBuilt: 'optional', heatingType: 'required', furnishedStatus: 'optional', condition: 'required' },
  Commercial: { areaM2: 'required', plotAreaM2: 'hidden', rooms: 'optional', bathrooms: 'optional', floor: 'optional', totalFloors: 'optional', yearBuilt: 'optional', heatingType: 'optional', furnishedStatus: 'optional', condition: 'optional' },
  Land: { areaM2: 'hidden', plotAreaM2: 'required', rooms: 'hidden', bathrooms: 'hidden', floor: 'hidden', totalFloors: 'hidden', yearBuilt: 'hidden', heatingType: 'hidden', furnishedStatus: 'hidden', condition: 'hidden' },
  Garage: { areaM2: 'required', plotAreaM2: 'hidden', rooms: 'hidden', bathrooms: 'hidden', floor: 'hidden', totalFloors: 'hidden', yearBuilt: 'optional', heatingType: 'hidden', furnishedStatus: 'hidden', condition: 'optional' },
  Other: { areaM2: 'required', plotAreaM2: 'hidden', rooms: 'optional', bathrooms: 'optional', floor: 'optional', totalFloors: 'optional', yearBuilt: 'optional', heatingType: 'optional', furnishedStatus: 'optional', condition: 'optional' },
};