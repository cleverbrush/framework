import { describe, expect, test } from 'vitest';
import { InMemoryJobRepository } from './jobRepository.js';

describe('InMemoryJobRepository', () => {
    test('getJobs returns empty array initially', async () => {
        const repo = new InMemoryJobRepository();
        expect(await repo.getJobs()).toEqual([]);
    });

    test('createJob adds a job with status active', async () => {
        const repo = new InMemoryJobRepository();
        const job = await repo.createJob({ id: 'j1', name: 'test job' } as any);
        expect(job.id).toBe('j1');
        expect(job.status).toBe('active');

        const jobs = await repo.getJobs();
        expect(jobs).toHaveLength(1);
        expect(jobs[0]).toEqual(job);
    });

    test('getJobById returns the correct job', async () => {
        const repo = new InMemoryJobRepository();
        await repo.createJob({ id: 'j1', name: 'a' } as any);
        await repo.createJob({ id: 'j2', name: 'b' } as any);

        const found = await repo.getJobById('j2');
        expect(found.id).toBe('j2');
    });

    test('getJobById throws for missing job', async () => {
        const repo = new InMemoryJobRepository();
        await expect(repo.getJobById('nonexistent')).rejects.toThrow(
            'Job with id nonexistent not found'
        );
    });

    test('removeJob removes an existing job', async () => {
        const repo = new InMemoryJobRepository();
        await repo.createJob({ id: 'j1', name: 'a' } as any);
        await repo.removeJob('j1');
        expect(await repo.getJobs()).toHaveLength(0);
    });

    test('removeJob throws for non-existent job', async () => {
        const repo = new InMemoryJobRepository();
        await expect(repo.removeJob('nope')).rejects.toThrow(
            'Job with id nope not found'
        );
    });

    test('saveJob updates an existing job', async () => {
        const repo = new InMemoryJobRepository();
        const job = await repo.createJob({
            id: 'j1',
            path: '/original'
        } as any);
        const updated = await repo.saveJob({ ...job, path: '/updated' } as any);
        expect(updated.path).toBe('/updated');
        const stored = await repo.getJobById('j1');
        expect(stored.path).toBe('/updated');
    });

    test('saveJob adds a job if not present', async () => {
        const repo = new InMemoryJobRepository();
        const newJob = { id: 'j99', path: '/new', status: 'active' } as any;
        const saved = await repo.saveJob(newJob);
        expect(saved.id).toBe('j99');
        expect(await repo.getJobs()).toHaveLength(1);
    });

    test('addInstance creates instance with correct jobId', async () => {
        const repo = new InMemoryJobRepository();
        const instance = await repo.addInstance('j1', {
            status: 'running',
            startedAt: new Date()
        } as any);
        expect(instance.jobId).toBe('j1');
        expect(instance.id).toBe(1);
    });

    test('addInstance increments id for each new instance', async () => {
        const repo = new InMemoryJobRepository();
        const i1 = await repo.addInstance('j1', { status: 'running' } as any);
        const i2 = await repo.addInstance('j1', { status: 'pending' } as any);
        expect(i1.id).toBe(1);
        expect(i2.id).toBe(2);
    });

    test('getInstancesWithStatus returns matching instances', async () => {
        const repo = new InMemoryJobRepository();
        await repo.addInstance('j1', { status: 'running' } as any);
        await repo.addInstance('j1', { status: 'failed' } as any);
        await repo.addInstance('j1', { status: 'running' } as any);

        const running = await repo.getInstancesWithStatus('j1', 'running');
        expect(running).toHaveLength(2);
        expect(running.every(i => i.status === 'running')).toBe(true);
    });

    test('getInstancesWithStatus returns empty array when none match', async () => {
        const repo = new InMemoryJobRepository();
        await repo.addInstance('j1', { status: 'running' } as any);
        const result = await repo.getInstancesWithStatus('j1', 'failed' as any);
        expect(result).toHaveLength(0);
    });

    test('saveInstance updates an existing instance', async () => {
        const repo = new InMemoryJobRepository();
        const inst = await repo.addInstance('j1', { status: 'running' } as any);
        const updated = await repo.saveInstance({
            ...inst,
            status: 'completed'
        } as any);
        expect(updated.status).toBe('completed');
    });

    test('saveInstance adds instance if not present (assigns new id)', async () => {
        const repo = new InMemoryJobRepository();
        // The implementation overwrites the id with the internal counter
        const newInst = { id: 99, jobId: 'j1', status: 'pending' } as any;
        const saved = await repo.saveInstance(newInst);
        expect(saved.jobId).toBe('j1');
        expect(saved.status).toBe('pending');
        const running = await repo.getInstancesWithStatus(
            'j1',
            'pending' as any
        );
        expect(running).toHaveLength(1);
    });

    test('setJobStatus updates status on an existing job', async () => {
        const repo = new InMemoryJobRepository();
        await repo.createJob({ id: 'j1', path: '/job1' } as any);
        const updated = await repo.setJobStatus('j1', 'failed' as any);
        expect(updated.id).toBe('j1');
        expect(updated.status).toBe('failed');
        const stored = await repo.getJobById('j1');
        expect(stored.status).toBe('failed');
    });

    test('setJobStatus throws for a nonexistent job', async () => {
        const repo = new InMemoryJobRepository();
        await expect(
            repo.setJobStatus('no-such-id', 'active' as any)
        ).rejects.toThrow('Job with id no-such-id not found');
    });

    test('getInstanceById returns the correct instance', async () => {
        const repo = new InMemoryJobRepository();
        const inst = await repo.addInstance('j1', { status: 'running' } as any);
        const found = await repo.getInstanceById(inst.id);
        expect(found).toBeDefined();
        expect(found.id).toBe(inst.id);
        expect(found.jobId).toBe('j1');
    });

    test('getInstanceById returns undefined for missing instance', async () => {
        const repo = new InMemoryJobRepository();
        const result = await repo.getInstanceById(9999);
        expect(result).toBeUndefined();
    });
});
