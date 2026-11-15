export type PropertyType = 'Apartment' | 'House' | 'Commercial' | 'Land' | 'Garage' | 'Other';
export type HeatingType = 'Central' | 'Gas' | 'Electric' | 'Wood' | 'HeatPump' | 'None';
export type FurnishedStatus = 'Furnished' | 'Partly' | 'Unfurnished';
export type PropertyCondition = 'NewBuild' | 'Renovated' | 'Good' | 'NeedsRenovation';

export const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'Apartment', label: 'Stan' },
  { value: 'House', label: 'Kuća' },
  { value: 'Commercial', label: 'Poslovni prostor' },
  { value: 'Land', label: 'Zemljište' },
  { value: 'Garage', label: 'Garaža' },
  { value: 'Other', label: 'Ostalo' },
];