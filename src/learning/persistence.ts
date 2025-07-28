import fs from 'fs/promises';
import path from 'path';
import winston from 'winston';

export interface LearningData {
  patterns: Array<[string, any]>;
  feedbackHistory: any[];
  lastUpdated: string;
  version: string;
}

export class LearningPersistence {
  private dataPath: string;
  private logger: winston.Logger;
  private readonly CURRENT_VERSION = '1.0.0';

  constructor(logger: winston.Logger, dataPath?: string) {
    this.logger = logger;
    this.dataPath = dataPath || path.join(process.cwd(), 'data', 'learning.json');
  }

  async ensureDataDirectory(): Promise<void> {
    const dir = path.dirname(this.dataPath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      this.logger.info(`Created data directory: ${dir}`);
    }
  }

  async save(data: LearningData): Promise<void> {
    try {
      await this.ensureDataDirectory();
      
      const dataToSave = {
        ...data,
        lastUpdated: new Date().toISOString(),
        version: this.CURRENT_VERSION
      };
      
      // Create backup of existing data
      await this.createBackup();
      
      // Save new data
      await fs.writeFile(
        this.dataPath,
        JSON.stringify(dataToSave, null, 2),
        'utf-8'
      );
      
      this.logger.info('Learning data saved successfully');
    } catch (error) {
      this.logger.error('Failed to save learning data:', error);
      throw error;
    }
  }

  async load(): Promise<LearningData | null> {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Check version compatibility
      if (parsed.version !== this.CURRENT_VERSION) {
        this.logger.warn(`Learning data version mismatch. Expected ${this.CURRENT_VERSION}, got ${parsed.version}`);
        // In a real application, you might want to migrate the data
      }
      
      this.logger.info('Learning data loaded successfully');
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.info('No existing learning data found');
        return null;
      }
      this.logger.error('Failed to load learning data:', error);
      throw error;
    }
  }

  async createBackup(): Promise<void> {
    try {
      await fs.access(this.dataPath);
      const backupPath = this.dataPath.replace('.json', `.backup-${Date.now()}.json`);
      await fs.copyFile(this.dataPath, backupPath);
      this.logger.debug(`Created backup: ${backupPath}`);
      
      // Clean old backups (keep only last 5)
      await this.cleanOldBackups();
    } catch (error) {
      // If file doesn't exist, no need to backup
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.error('Failed to create backup:', error);
      }
    }
  }

  private async cleanOldBackups(): Promise<void> {
    try {
      const dir = path.dirname(this.dataPath);
      const files = await fs.readdir(dir);
      
      const backupFiles = files
        .filter(f => f.includes('.backup-'))
        .sort()
        .reverse();
      
      // Remove old backups, keep only 5 most recent
      for (let i = 5; i < backupFiles.length; i++) {
        await fs.unlink(path.join(dir, backupFiles[i]));
        this.logger.debug(`Removed old backup: ${backupFiles[i]}`);
      }
    } catch (error) {
      this.logger.error('Failed to clean old backups:', error);
    }
  }

  async exportToCSV(outputPath: string): Promise<void> {
    try {
      const data = await this.load();
      if (!data) {
        throw new Error('No learning data to export');
      }

      let csv = 'Timestamp,TaskID,Success,ExecutionTime,CLI,UserSatisfaction\n';
      
      for (const feedback of data.feedbackHistory) {
        csv += `${feedback.timestamp || 'N/A'},${feedback.taskId},${feedback.success},${feedback.executionTime},${feedback.cli},${feedback.userSatisfaction || 'N/A'}\n`;
      }

      await fs.writeFile(outputPath, csv, 'utf-8');
      this.logger.info(`Learning data exported to CSV: ${outputPath}`);
    } catch (error) {
      this.logger.error('Failed to export to CSV:', error);
      throw error;
    }
  }
}