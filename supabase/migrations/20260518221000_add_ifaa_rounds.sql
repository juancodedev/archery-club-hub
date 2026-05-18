-- Create the IFAA Round Type Enum
CREATE TYPE ifaa_round_type AS ENUM (
  'field', 
  'hunter', 
  'animal_2d', 
  'animal_3d', 
  '3d_hunting', 
  '3d_standard', 
  'field_expert', 
  'indoor_standard', 
  'flint_indoor'
);

-- Alter tournament_types to support IFAA rounds
ALTER TABLE tournament_types ADD COLUMN ifaa_round ifaa_round_type DEFAULT NULL;

-- Alter scores to track the computed IFAA class at the moment of the competition
ALTER TABLE scores ADD COLUMN ifaa_class CHAR(1) CHECK (ifaa_class IN ('A', 'B', 'C'));
