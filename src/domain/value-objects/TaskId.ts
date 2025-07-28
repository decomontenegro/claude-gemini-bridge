import { v4 as uuidv4 } from 'uuid';

export class TaskId {
  constructor(public readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid TaskId: ${value}`);
    }
  }

  private isValid(value: string): boolean {
    // UUID v4 validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  public equals(other: TaskId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }

  public static generate(): TaskId {
    return new TaskId(uuidv4());
  }

  public static fromString(value: string): TaskId {
    return new TaskId(value);
  }
}