/*
 * Copyright 2021 Lightbend Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Mocks the behaviour of a single Akka Serverless EventSourcedEntity.
 *
 * Handles any commands and events, internally tracking the state and maintaining an event log.
 *
 * NOTE: Entity IDs are not handled, so all commands are assumed to refer to a single entity.
 */
export class MockEventSourcedEntity {
  events = [];
  state;
  error;
  grpcService;

  constructor(entity, entityId) {
    this.entity = entity;
    this.entityId = entityId;
    this.state = entity.initial(entityId);
    this.grpcService = entity.serviceName
      .split(".")
      .reduce((obj, part) => obj[part], entity.grpc).service;
  }

  /**
   * Handle the provided command, and return the result. Any emitted events are also handled.
   *
   * @param {string} commandName the command method name (as per the entity proto definition)
   * @param {object} command the request body
   * @param {MockEventSourcedCommandContext} ctx override the context object for this handler for advanced behaviour
   * @returns the result of the command
   */
  handleCommand(
    commandName,
    command,
    ctx = new MockEventSourcedCommandContext()
  ) {
    const behaviors = this.entity.behavior(this.state);
    const handler = behaviors.commandHandlers[commandName];
    const grpcMethod = this.grpcService[commandName];

    const request = grpcMethod.requestDeserialize(
      grpcMethod.requestSerialize(command)
    );

    const result = handler(request, this.state, ctx);
    ctx.events.forEach((event) => this.handleEvent(event));
    this.error = ctx.error;

    return grpcMethod.responseDeserialize(grpcMethod.responseSerialize(result));
  }

  /**
   * Handle the provied event, and add it to the event log.
   * @param {object} event the event payload
   */
  handleEvent(event) {
    const behaviors = this.entity.behavior(this.state);
    const handler =
      behaviors.eventHandlers[event.type || event.constructor.name];

    this.state = handler(event, this.state);
    this.events.push(event);
  }
}

/**
 * Mocks the behaviour of a single Akka Serverless Value entity.
 *
 * Handles any commands, internally maintaining the state.
 *
 * NOTE: Entity IDs are not handled, so all commands are assumed to refer to a single entity.
 */
export class MockValueEntity {
  state;
  error;
  grpcService;

  constructor(entity, entityId) {
    this.entity = entity;
    this.entityId = entityId;
    this.state = entity.initial(entityId);
    this.grpcService = entity.serviceName
      .split(".")
      .reduce((obj, part) => obj[part], entity.grpc).service;
  }

  /**
   * Handle the provided command, and return the result. Any emitted events are also handled.
   *
   * @param {string} commandName the command method name (as per the entity proto definition)
   * @param {object} command the request body
   * @param {MockValueEntityCommandContext} ctx override the context object for this handler for advanced behaviour
   * @returns the result of the command
   */
  handleCommand(
    commandName,
    command,
    ctx = new MockValueEntityCommandContext()
  ) {
    const handler = this.entity.commandHandlers[commandName];
    const grpcMethod = this.grpcService[commandName];

    const request = grpcMethod.requestDeserialize(
      grpcMethod.requestSerialize(command)
    );

    const result = handler(request, this.state, ctx);
    if (ctx.delete) {
      this.state = this.entity.initial(this.entityId);
    } else if (ctx.updatedState) {
      this.state = ctx.updatedState;
    }
    this.error = ctx.error;

    return grpcMethod.responseDeserialize(grpcMethod.responseSerialize(result));
  }
}

/**
 * Generic mock CommandContext for any Akka Serverless entity
 * @type { import("../lib/akkaserverless").CommandContext }
 */
export class MockCommandContext {
  effects = [];
  thenForward = () => {};
  error;

  /**
   * Set the `thenForward` callback for this context.
   * This allows tests handling both failure and success cases for forwarded commands.
   * @param  handler the thenForward callback to set
   */
  onForward(handler) {
    this.thenForward = handler;
  }

  fail(error) {
    this.error = error;
  }

  effect(method, message, synchronous, metadata) {
    this.effects.push({
      method,
      message,
      synchronous,
      metadata,
    });
  }
}

/**
 * Mocks the behaviour of the command context object within Akka Serverless.
 *
 * By default, calls to [AkkaServerlessTestKitEntity~handleCommand] will
 * construct their own instance of this class, however for making assertions on
 * forwarding or emmitted effects you may provide your own.
 *
 * @type { import("../lib/akkaserverless").EventSourcedCommandContext<unknown> }
 */
export class MockEventSourcedCommandContext extends MockCommandContext {
  events = [];

  emit(event) {
    this.events.push(event);
  }
}

/**
 * Mocks the behaviour of the command context object within Akka Serverless.
 *
 * By default, calls to [AkkaServerlessTestKitEntity~handleCommand] will
 * construct their own instance of this class, however for making assertions on
 * forwarding or emmitted effects you may provide your own.
 *
 * @type { import("../lib/akkaserverless").ValueEntityCommandContext<unknown> }
 */
export class MockValueEntityCommandContext extends MockCommandContext {
  updatedState = undefined;
  delete = false;

  updateState(state) {
    this.updatedState = state;
  }

  deleteState() {
    this.delete = true;
  }
}
