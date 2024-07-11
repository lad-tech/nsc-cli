import { JSONSchema7 } from 'json-schema';

export interface CrudSchema {
  entityName: 'Notification';
  entityData: JSONSchema7;
  filterColumns: string[]; // Колонки для фильтрации
}
