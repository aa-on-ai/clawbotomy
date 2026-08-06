'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  BOUNDARY_OPTIONS,
  INBOX_CAPABILITIES,
  buildInboxPreflightPlan,
  inboxPlanFilename,
  serializeInboxPreflightPlan,
  type BoundaryIntent,
  type CapabilityId,
  type InboxPreflightPlan,
} from '@/lib/inbox-preflight';

import styles from './preflight.module.css';

type IntentValue = BoundaryIntent | '';
type CapabilityFormState = Record<CapabilityId, { selected: boolean; intent: IntentValue }>;
type ActionStatus = 'idle' | 'copying' | 'copied' | 'copy-error' | 'downloaded';

interface ValidationState {
  label?: string;
  capabilities?: string;
  intents?: Partial<Record<CapabilityId, string>>;
}

function initialCapabilities(): CapabilityFormState {
  return Object.fromEntries(
    INBOX_CAPABILITIES.map((capability) => [capability.id, { selected: false, intent: '' }]),
  ) as CapabilityFormState;
}

const BOUNDARY_LABELS = Object.fromEntries(
  BOUNDARY_OPTIONS.map((option) => [option.id, option.label]),
) as Record<BoundaryIntent, string>;

export function InboxPreflightPlanner() {
  const [planLabel, setPlanLabel] = useState('');
  const [configurationReference, setConfigurationReference] = useState('');
  const [capabilities, setCapabilities] = useState<CapabilityFormState>(initialCapabilities);
  const [validation, setValidation] = useState<ValidationState>({});
  const [plan, setPlan] = useState<InboxPreflightPlan | null>(null);
  const [stale, setStale] = useState(false);
  const [actionStatus, setActionStatus] = useState<ActionStatus>('idle');
  const labelRef = useRef<HTMLInputElement>(null);
  const capabilityGroupRef = useRef<HTMLFieldSetElement>(null);

  const serializedPlan = useMemo(
    () => (plan ? serializeInboxPreflightPlan(plan) : ''),
    [plan],
  );
  const runnerCommand = plan
    ? `npm run inbox -- run --plan "./${inboxPlanFilename(plan)}" --agent bounded`
    : '';
  const selectedCount = INBOX_CAPABILITIES.filter((capability) => capabilities[capability.id].selected).length;
  const hasInput = Boolean(planLabel || configurationReference || selectedCount || plan);

  useEffect(() => {
    if (!['copied', 'copy-error', 'downloaded'].includes(actionStatus)) return;
    const timeout = window.setTimeout(() => setActionStatus('idle'), 3200);
    return () => window.clearTimeout(timeout);
  }, [actionStatus]);

  const inputsChanged = () => {
    if (plan) setStale(true);
    setActionStatus('idle');
    setValidation({});
  };

  const changeLabel = (value: string) => {
    setPlanLabel(value);
    inputsChanged();
  };

  const changeConfigurationReference = (value: string) => {
    setConfigurationReference(value);
    inputsChanged();
  };

  const toggleCapability = (capabilityId: CapabilityId, selected: boolean) => {
    setCapabilities((current) => ({
      ...current,
      [capabilityId]: {
        selected,
        intent: selected ? current[capabilityId].intent : '',
      },
    }));
    inputsChanged();
  };

  const changeIntent = (capabilityId: CapabilityId, intent: IntentValue) => {
    setCapabilities((current) => ({
      ...current,
      [capabilityId]: { ...current[capabilityId], intent },
    }));
    inputsChanged();
  };

  const validate = () => {
    const next: ValidationState = {};
    const selected = INBOX_CAPABILITIES.filter((capability) => capabilities[capability.id].selected);

    if (!planLabel.trim()) next.label = 'Give this plan a short, non-secret label.';
    if (selected.length === 0) next.capabilities = 'Choose at least one Inbox capability to test.';

    const missingIntents: Partial<Record<CapabilityId, string>> = {};
    for (const capability of selected) {
      if (!capabilities[capability.id].intent) {
        missingIntents[capability.id] = `Choose your intended boundary for ${capability.name.toLowerCase()}.`;
      }
    }
    if (Object.keys(missingIntents).length > 0) next.intents = missingIntents;

    setValidation(next);
    return next;
  };

  const focusFirstError = (errors: ValidationState) => {
    window.requestAnimationFrame(() => {
      if (errors.label) {
        labelRef.current?.focus();
        return;
      }
      const firstMissingIntent = Object.keys(errors.intents || {})[0] as CapabilityId | undefined;
      if (firstMissingIntent) {
        document.getElementById(`intent-${firstMissingIntent}`)?.focus();
        return;
      }
      capabilityGroupRef.current?.focus();
    });
  };

  const buildPlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validate();
    if (errors.label || errors.capabilities || errors.intents) {
      focusFirstError(errors);
      return;
    }

    const selections = INBOX_CAPABILITIES.flatMap((capability) => {
      const state = capabilities[capability.id];
      return state.selected
        ? [{ capabilityId: capability.id, intendedBoundary: state.intent as BoundaryIntent }]
        : [];
    });

    try {
      const nextPlan = buildInboxPreflightPlan({
        planLabel,
        configurationReference,
        selections,
      });
      setPlan(nextPlan);
      setStale(false);
      setActionStatus('idle');
      setValidation({});
    } catch (error) {
      setValidation({ capabilities: error instanceof Error ? error.message : 'The plan could not be built.' });
      focusFirstError({ capabilities: 'invalid' });
    }
  };

  const reset = () => {
    setPlanLabel('');
    setConfigurationReference('');
    setCapabilities(initialCapabilities());
    setValidation({});
    setPlan(null);
    setStale(false);
    setActionStatus('idle');
    window.requestAnimationFrame(() => labelRef.current?.focus());
  };

  const copyPlan = async () => {
    if (!plan || stale) return;
    setActionStatus('copying');
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await Promise.race([
        navigator.clipboard.writeText(serializedPlan),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('Clipboard request timed out')), 1600);
        }),
      ]);
      setActionStatus('copied');
    } catch {
      setActionStatus('copy-error');
    }
  };

  const downloadPlan = () => {
    if (!plan || stale) return;
    const url = URL.createObjectURL(new Blob([serializedPlan], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = inboxPlanFilename(plan);
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setActionStatus('downloaded');
  };

  const statusMessage = actionStatus === 'copying'
    ? 'Copying the plan…'
    : actionStatus === 'copied'
      ? 'Plan copied to the clipboard.'
      : actionStatus === 'copy-error'
        ? 'Clipboard access failed. Select the JSON preview and copy it manually.'
        : actionStatus === 'downloaded'
          ? 'Plan downloaded to this device.'
          : plan && stale
            ? 'Inputs changed. Build the plan again before copying or downloading it.'
            : plan
              ? 'Plan ready. No agent ran and no production access changed.'
              : 'Choose capabilities and build a plan. Nothing is sent or saved.';

  return (
    <div className={styles.workspace}>
      <form className={styles.formPanel} onSubmit={buildPlan} noValidate>
        <div className={styles.panelHeader}>
          <span aria-hidden="true">[01]</span>
          <div>
            <h2>Define the intended boundary</h2>
            <p>Record what you are considering before evidence changes the decision.</p>
          </div>
        </div>

        <div className={styles.identityFields}>
          <div className={styles.field}>
            <label htmlFor="plan-label">Plan label</label>
            <input
              ref={labelRef}
              id="plan-label"
              name="planLabel"
              type="text"
              value={planLabel}
              maxLength={80}
              placeholder="e.g. support inbox agent"
              autoComplete="off"
              aria-invalid={Boolean(validation.label)}
              aria-errormessage={validation.label ? 'plan-label-error' : undefined}
              onChange={(event) => changeLabel(event.target.value)}
            />
            {validation.label ? <p id="plan-label-error" className={styles.fieldError}>{validation.label}</p> : null}
          </div>

          <div className={styles.field}>
            <label htmlFor="configuration-reference">Configuration reference <span>Optional</span></label>
            <input
              id="configuration-reference"
              name="configurationReference"
              type="text"
              value={configurationReference}
              maxLength={120}
              placeholder="e.g. commit or version"
              autoComplete="off"
              aria-describedby="configuration-reference-help"
              onChange={(event) => changeConfigurationReference(event.target.value)}
            />
            <p id="configuration-reference-help" className={styles.fieldHelp}>
              Use a non-secret reference only. Never paste prompts, message content, keys, or credentials.
            </p>
          </div>
        </div>

        <fieldset
          ref={capabilityGroupRef}
          className={styles.capabilityFieldset}
          tabIndex={-1}
          aria-invalid={Boolean(validation.capabilities || validation.intents)}
          aria-describedby={validation.capabilities ? 'capability-error' : 'capability-help'}
        >
          <legend>Inbox capabilities</legend>
          <p id="capability-help" className={styles.fieldsetHelp}>
            Choose the powers under consideration, then state your intended boundary. Clawbotomy does not recommend or approve that choice here.
          </p>
          {validation.capabilities ? <p id="capability-error" className={styles.fieldError}>{validation.capabilities}</p> : null}

          <div className={styles.capabilityRows}>
            {INBOX_CAPABILITIES.map((capability) => {
              const state = capabilities[capability.id];
              const intentError = validation.intents?.[capability.id];
              return (
                <div
                  key={capability.id}
                  className={`${styles.capabilityRow} ${state.selected ? styles.selectedRow : ''}`}
                >
                  <div className={styles.capabilityChoice}>
                    <input
                      id={`capability-${capability.id}`}
                      name="capabilities"
                      type="checkbox"
                      value={capability.id}
                      checked={state.selected}
                      onChange={(event) => toggleCapability(capability.id, event.target.checked)}
                    />
                    <label htmlFor={`capability-${capability.id}`}>
                      <strong>{capability.name}</strong>
                      <span>{capability.description}</span>
                    </label>
                  </div>

                  <div className={styles.intentField}>
                    <label htmlFor={`intent-${capability.id}`}>Your intended boundary</label>
                    <div className={styles.selectControl}>
                      <select
                        id={`intent-${capability.id}`}
                        name={`intent-${capability.id}`}
                        value={state.intent}
                        disabled={!state.selected}
                        required={state.selected}
                        aria-invalid={Boolean(intentError)}
                        aria-errormessage={intentError ? `intent-${capability.id}-error` : undefined}
                        onChange={(event) => changeIntent(capability.id, event.target.value as IntentValue)}
                      >
                        <option value="">Choose intent</option>
                        {BOUNDARY_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                      <span className={styles.selectChevron} aria-hidden="true" />
                    </div>
                    {intentError ? (
                      <p id={`intent-${capability.id}-error`} className={styles.fieldError}>{intentError}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className={styles.formActions}>
          <button type="submit" className={styles.buildButton}>Build local plan</button>
          <button type="button" className={styles.resetButton} onClick={reset} disabled={!hasInput}>Reset</button>
        </div>
      </form>

      <section className={styles.outputPanel} aria-labelledby="plan-output-title">
        <div className={styles.panelHeaderDark}>
          <span aria-hidden="true">[02]</span>
          <div>
            <h2 id="plan-output-title">Inspect the required test plan</h2>
            <p>Your intent stays separate from any future evidence-backed decision.</p>
          </div>
        </div>

        <div className={`${styles.outputStatus} ${stale ? styles.staleStatus : ''}`} role="status">
          <span className={styles.statusMark} aria-hidden="true" />
          <p>{statusMessage}</p>
        </div>

        {!plan ? (
          <div className={styles.emptyOutput}>
            <p className={styles.emptyIndex}>No plan yet</p>
            <h3>Define the powers before you test them.</h3>
            <p>
              The output will list your intended boundary, every required mock-Inbox scenario,
              and the trace or state evidence the local reference runner will collect.
            </p>
          </div>
        ) : (
          <div className={`${styles.planOutput} ${stale ? styles.stalePlan : ''}`} data-stale={stale}>
            <dl className={styles.planFacts}>
              <div>
                <dt>Capabilities</dt>
                <dd>{plan.requestedCapabilities.length}</dd>
              </div>
              <div>
                <dt>Required scenarios</dt>
                <dd>{plan.requiredScenarios.length}</dd>
              </div>
              <div>
                <dt>Clawbotomy decision</dt>
                <dd>None / not run</dd>
              </div>
            </dl>

            <section className={styles.intentSummary} aria-labelledby="intent-summary-title">
              <h3 id="intent-summary-title">Your intended boundary</h3>
              <ul>
                {plan.requestedCapabilities.map((capability) => (
                  <li key={capability.id}>
                    <span>{capability.name}</span>
                    <strong>{BOUNDARY_LABELS[capability.operatorIntent]}</strong>
                  </li>
                ))}
              </ul>
              <p>Self-declared intent only. Clawbotomy has not confirmed or recommended these boundaries.</p>
            </section>

            <section className={styles.scenarioSection} aria-labelledby="scenario-title">
              <div className={styles.scenarioHeading}>
                <h3 id="scenario-title">Required scenarios</h3>
                <span>{plan.requiredScenarios.length} total</span>
              </div>
              <div className={styles.scenarioList}>
                {plan.requiredScenarios.map((scenario, index) => (
                  <details key={scenario.id} open={index === 0}>
                    <summary>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{scenario.title}</strong>
                    </summary>
                    <div className={styles.scenarioBody}>
                      <p>{scenario.purpose}</p>
                      <dl>
                        <div>
                          <dt>Covers</dt>
                          <dd>{scenario.coversCapabilities.map((id) => INBOX_CAPABILITIES.find((item) => item.id === id)?.name).join(', ')}</dd>
                        </div>
                        <div>
                          <dt>Controls</dt>
                          <dd>{scenario.controls.join(', ')}</dd>
                        </div>
                        <div>
                          <dt>Evidence needed</dt>
                          <dd>{scenario.expectedEvidence.join(', ')}</dd>
                        </div>
                      </dl>
                      <code>{scenario.id}</code>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <section className={styles.jsonSection} aria-labelledby="json-title">
              <div className={styles.jsonHeading}>
                <div>
                  <h3 id="json-title">Plan artifact</h3>
                  <a href="/evidence/schema/inbox-preflight-plan.v1.schema.json">Read the schema</a>
                </div>
                <div className={styles.outputActions}>
                  <button type="button" onClick={copyPlan} disabled={stale || actionStatus === 'copying'}>
                    {actionStatus === 'copying'
                      ? 'Copying…'
                      : actionStatus === 'copied'
                        ? 'Copied'
                        : 'Copy plan'}
                  </button>
                  <button type="button" onClick={downloadPlan} disabled={stale}>Download plan</button>
                </div>
              </div>
              <pre tabIndex={0} aria-label={`Inbox preflight plan JSON for ${plan.subject.label}`}>
                <code>{serializedPlan}</code>
              </pre>
              <div className={styles.runnerCommand}>
                <h4>Smoke-test the plan with a reference control</h4>
                <p>
                  Move the downloaded plan into your checkout, then run the bundled agent against
                  a fresh synthetic Inbox. This checks the plan and runner, not your configured agent.
                </p>
                <pre tabIndex={0} aria-label="Command to run the downloaded plan with the bounded reference agent">
                  <code>{runnerCommand}</code>
                </pre>
                <p>
                  Ready for your runtime? <a href="/evaluate">Choose the OpenClaw or Hermes adapter.</a>
                </p>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
