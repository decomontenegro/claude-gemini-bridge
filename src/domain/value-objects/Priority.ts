export class Priority {
  public static readonly LOW = new Priority(1, 'LOW');
  public static readonly MEDIUM = new Priority(2, 'MEDIUM');
  public static readonly HIGH = new Priority(3, 'HIGH');
  public static readonly URGENT = new Priority(4, 'URGENT');

  private static readonly VALUES = [
    Priority.LOW,
    Priority.MEDIUM,
    Priority.HIGH,
    Priority.URGENT
  ];

  private constructor(
    public readonly value: number,
    public readonly label: string
  ) {}

  public equals(other: Priority): boolean {
    return this.value === other.value;
  }

  public isHigherThan(other: Priority): boolean {
    return this.value > other.value;
  }

  public isLowerThan(other: Priority): boolean {
    return this.value < other.value;
  }

  public toString(): string {
    return this.label;
  }

  public static fromValue(value: number): Priority {
    const priority = Priority.VALUES.find(p => p.value === value);
    if (!priority) {
      throw new Error(`Invalid priority value: ${value}`);
    }
    return priority;
  }

  public static fromLabel(label: string): Priority {
    const priority = Priority.VALUES.find(p => p.label === label);
    if (!priority) {
      throw new Error(`Invalid priority label: ${label}`);
    }
    return priority;
  }

  public static all(): Priority[] {
    return [...Priority.VALUES];
  }

  public static compare(a: Priority, b: Priority): number {
    return b.value - a.value; // Higher priority first
  }
}