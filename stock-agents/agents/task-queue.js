/**
 * task-queue.js - 任务队列模块
 * 支持优先级、并行执行、超时、重试
 */

class TaskQueue {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 3;
    this.defaultTimeout = options.defaultTimeout || 30000;
    this.defaultRetries = options.defaultRetries || 3;
    this.retryDelay = options.retryDelay || 1000;

    this.queue = [];
    this.running = new Map();
    this.completed = new Map();
    this.taskIdCounter = 0;
  }

  /**
   * 添加任务到队列
   * @param {object} task - 任务定义
   * @returns {string} 任务ID
   */
  addTask(task) {
    const taskId = `task_${++this.taskIdCounter}`;
    const taskEntry = {
      id: taskId,
      name: task.name || taskId,
      fn: task.fn,
      params: task.params || {},
      priority: task.priority || 'medium',
      timeout: task.timeout || this.defaultTimeout,
      retries: task.retries ?? this.defaultRetries,
      dependsOn: task.dependsOn || [],
      status: 'pending',
      result: null,
      error: null,
      attempts: 0,
      createdAt: Date.now()
    };

    this.queue.push(taskEntry);
    this._sortQueue();

    return taskId;
  }

  /**
   * 执行队列中的所有任务
   */
  async executeAll() {
    const results = {};

    while (this.queue.length > 0 || this.running.size > 0) {
      // 启动可执行的任务
      while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
        const task = this._getNextRunnableTask();
        if (!task) break;

        this._startTask(task);
      }

      // 等待任意任务完成
      if (this.running.size > 0) {
        await this._waitForAnyTask();
      }
    }

    // 收集结果
    for (const [taskId, task] of this.completed) {
      results[task.name] = task.error ? { error: task.error } : task.result;
    }

    return results;
  }

  /**
   * 并行执行任务
   * @param {Array} tasks - 任务数组
   * @returns {object} 结果
   */
  async executeParallel(tasks) {
    const taskIds = tasks.map(t => this.addTask(t));
    return await this.executeAll();
  }

  /**
   * 串行执行任务
   * @param {Array} tasks - 任务数组
   * @returns {object} 结果
   */
  async executeSerial(tasks) {
    const results = {};

    for (const task of tasks) {
      const taskId = this.addTask({ ...task, dependsOn: [] });
      const result = await this._executeSingleTask(this.queue.find(t => t.id === taskId) || {
        id: taskId,
        ...task,
        status: 'pending',
        attempts: 0,
        retries: task.retries ?? this.defaultRetries,
        timeout: task.timeout || this.defaultTimeout
      });
      results[task.name || taskId] = result;
    }

    return results;
  }

  /**
   * 取消任务
   */
  cancelTask(taskId) {
    // 从队列中移除
    this.queue = this.queue.filter(t => t.id !== taskId);

    // 取消正在运行的任务
    if (this.running.has(taskId)) {
      const task = this.running.get(taskId);
      if (task.timeoutId) clearTimeout(task.timeoutId);
      task.status = 'cancelled';
      this.running.delete(taskId);
      this.completed.set(taskId, task);
    }
  }

  /**
   * 取消所有任务
   */
  cancelAll() {
    for (const [taskId] of this.running) {
      this.cancelTask(taskId);
    }
    this.queue = [];
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId) {
    if (this.running.has(taskId)) return this.running.get(taskId);
    if (this.completed.has(taskId)) return this.completed.get(taskId);
    return this.queue.find(t => t.id === taskId) || null;
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      pending: this.queue.length,
      running: this.running.size,
      completed: this.completed.size,
      total: this.queue.length + this.running.size + this.completed.size
    };
  }

  // === 内部方法 ===

  _sortQueue() {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    this.queue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  _getNextRunnableTask() {
    for (let i = 0; i < this.queue.length; i++) {
      const task = this.queue[i];
      const depsCompleted = task.dependsOn.every(depId =>
        this.completed.has(depId) && this.completed.get(depId).status === 'completed'
      );
      if (depsCompleted) {
        return this.queue.splice(i, 1)[0];
      }
    }
    return null;
  }

  _startTask(task) {
    task.status = 'running';
    task.startedAt = Date.now();
    this.running.set(task.id, task);

    // 设置超时
    const timeoutId = setTimeout(() => {
      if (this.running.has(task.id)) {
        task.error = `任务超时 (${task.timeout}ms)`;
        task.status = 'timeout';
        this.running.delete(task.id);
        this.completed.set(task.id, task);
      }
    }, task.timeout);

    task.timeoutId = timeoutId;

    // 执行任务
    this._executeWithRetry(task).catch(() => {});
  }

  async _executeWithRetry(task) {
    while (task.attempts <= task.retries) {
      try {
        task.attempts++;
        const result = await task.fn(task.params);
        task.result = result;
        task.status = 'completed';
        break;
      } catch (error) {
        task.error = error.message;

        if (task.attempts <= task.retries) {
          // 等待后重试
          const delay = this.retryDelay * Math.pow(2, task.attempts - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          task.status = 'failed';
        }
      }
    }

    // 清理超时定时器
    if (task.timeoutId) clearTimeout(task.timeoutId);

    this.running.delete(task.id);
    this.completed.set(task.id, task);
  }

  async _executeSingleTask(task) {
    task.status = 'running';
    task.startedAt = Date.now();

    try {
      task.attempts++;
      const result = await task.fn(task.params);
      task.result = result;
      task.status = 'completed';
      return result;
    } catch (error) {
      task.error = error.message;
      task.status = 'failed';
      return { error: error.message };
    }
  }

  async _waitForAnyTask() {
    return new Promise(resolve => {
      const check = () => {
        if (this.running.size === 0) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }
}

module.exports = TaskQueue;
