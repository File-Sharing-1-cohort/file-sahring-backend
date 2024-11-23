import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('file')
export class TransferredFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  originalFileName: string;

  @Column({ nullable: true })
  awsFileName: string;

  @Column({ nullable: true })
  link: string;

  @Column({ nullable: true })
  @Exclude()
  password: string;

  @CreateDateColumn({ type: 'timestamptz' })
  loadedAt: Date;

  @Column({ default: 24 })
  expirationHours: number;

  @Column({
    type: 'bigint',
    transformer: { to: (value) => value, from: (value) => Number(value) },
    default: 0,
  })
  fileSize: number;

  @Column({ default: false })
  @Exclude()
  markedToDelete: boolean;

  @Column({ nullable: true })
  fileType: string;
}
