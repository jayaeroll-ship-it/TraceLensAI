import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ScanLine,
  LayoutDashboard,
  ListChecks,
  FlaskConical,
  ShieldAlert,
  Code2,
  FileBarChart,
  Plus,
  Search,
  ArrowUpRight,
  Download,
  Trash2,
  Pencil,
  X,
  Check,
  ChevronRight,
  Activity,
  Sparkles,
  Menu,
} from 'lucide-react';
import './style.css';

const API_BASE = `${(import.meta.env.VITE_API_ORIGIN || '').replace(/\/+$/, '')}/api`;
const pages = [
  ['Dashboard', LayoutDashboard],
  ['Requirements', ListChecks],
  ['Test cases', FlaskConical],
  ['Evidence gaps', ShieldAlert],
  ['Source evidence', Code2],
  ['QA report', FileBarChart],
];
async function api(path, method = 'GET', body) {
  let response;
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers:
        body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
  } catch {
    throw Error(
      'Cannot reach the backend. Start FastAPI on port 8000 and retry.'
    );
  }
  if (!response.ok) {
    let data = await response.json().catch(() => ({}));
    throw Error(
      typeof data.detail === 'string'
        ? data.detail
        : Array.isArray(data.detail)
          ? data.detail.map((x) => x.msg).join('; ')
          : 'Request failed. Check that the backend is running.'
    );
  }
  return response.json();
}
function Badge({ children }) {
  return (
    <span
      className={'badge ' + String(children).toLowerCase().replaceAll(' ', '-')}
    >
      {children}
    </span>
  );
}
function App() {
  const [projects, setProjects] = useState([]),
    [pid, setPid] = useState(''),
    [data, setData] = useState(null),
    [page, setPage] = useState('Dashboard'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [modal, setModal] = useState(null),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('All'),
    [sources, setSources] = useState([]),
    [selected, setSelected] = useState(''),
    [suggested, setSuggested] = useState(null),
    [menu, setMenu] = useState(false);
  async function loadProjects(prefer) {
    const p = await api('/projects');
    setProjects(p);
    setPid(
      String(
        prefer ?? (p.some((x) => String(x.id) === pid) ? pid : (p[0]?.id ?? ''))
      )
    );
  }
  async function refresh() {
    if (!pid) {
      setData(null);
      return;
    }
    const [d, s] = await Promise.all([
      api(`/projects/${pid}/workspace`),
      api(`/projects/${pid}/sources`),
    ]);
    setData(d);
    setSources(s);
  }
  useEffect(() => {
    loadProjects().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setSuggested(null);
    setSelected('');
    if (pid)
      Promise.all([
        api(`/projects/${pid}/workspace`),
        api(`/projects/${pid}/sources`),
      ])
        .then(([d, s]) => {
          if (!cancelled) {
            setData(d);
            setSources(s);
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    return () => {
      cancelled = true;
    };
  }, [pid]);
  useEffect(() => {
    setQuery('');
    setFilter('All');
    setMenu(false);
  }, [page]);
  async function run(fn, message) {
    setBusy(true);
    setError('');
    try {
      await fn();
      if (message) setNotice(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function mutate(path, method, body) {
    await api(path, method, body);
    await refresh();
  }
  function remove(path, description) {
    if (window.confirm(description))
      run(() => mutate(path, 'DELETE'), 'Deleted.');
  }
  function reqForm(r = {}) {
    setModal({
      kind: 'requirement',
      id: r.id,
      title: r.title || '',
      description: r.description || '',
      criteria: r.criteria || '',
      priority: r.priority || 'Medium',
    });
  }
  function testForm(t = {}) {
    setModal({
      kind: 'test',
      id: t.id,
      title: t.title || '',
      requirement_id: t.requirement_id || data.requirements[0]?.id || '',
      category: t.category || 'Positive',
      steps: t.steps || '',
      expected: t.expected || '',
    });
  }
  async function save(e) {
    e.preventDefault();
    await run(async () => {
      const { kind, id, ...body } = modal;
      if (kind === 'project') {
        const p = await api('/projects', 'POST', body);
        await loadProjects(p.id);
      } else if (kind === 'requirement')
        await mutate(
          id ? `/requirements/${id}` : `/projects/${pid}/requirements`,
          id ? 'PUT' : 'POST',
          body
        );
      else if (kind === 'test')
        await mutate(id ? `/tests/${id}` : '/tests', id ? 'PUT' : 'POST', {
          ...body,
          requirement_id: Number(body.requirement_id),
        });
      else await mutate(`/tests/${id}/result`, 'PUT', body);
      setModal(null);
    }, 'Saved successfully.');
  }
  const stats = data?.stats;
  const coverage = stats?.requirements
    ? Math.round((stats.covered / stats.requirements) * 100)
    : 0;
  const matches = (x) =>
    (x.title + ' ' + (x.description || '') + ' ' + (x.steps || ''))
      .toLowerCase()
      .includes(query.toLowerCase());
  const findings = data?.findings || [];
  function gapList(items) {
    return items.length ? (
      <div className="gap-list">
        {items.map((f) => (
          <article className="finding" key={f.requirement_id + '-' + f.kind}>
            <div className={'severity-mark ' + f.severity.toLowerCase()}>
              <ShieldAlert size={18} />
            </div>
            <div>
              <div className="finding-title">
                <h3>{f.kind}</h3>
                <Badge>{f.severity}</Badge>
              </div>
              <p className="requirement-ref">
                REQ-{String(f.requirement_id).padStart(3, '0')} · {f.title}
              </p>
              <p>{f.explanation}</p>
              <p className="next">
                <ChevronRight size={14} />
                {f.next_step}
              </p>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <div className="empty">
        No findings. Add requirements and tests to assess coverage.
      </div>
    );
  }
  return (
    <div className="app">
      <aside className={menu ? 'sidebar open' : 'sidebar'}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage('Dashboard');
          }}
        >
          <span className="brand-icon">
            <ScanLine />
          </span>
          TraceLens <span className="ai">AI</span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <div className="project-card">
          <span className="project-avatar">A</span>
          <div>
            <b>QA workspace</b>
            <small>Local portfolio demo</small>
          </div>
        </div>
        <nav>
          {pages.map(([name, Icon]) => (
            <button
              key={name}
              className={page === name ? 'nav active' : 'nav'}
              onClick={() => setPage(name)}
            >
              <Icon size={18} />
              {name}
              {name === 'Evidence gaps' && stats?.gaps > 0 && (
                <span className="count">{stats.gaps}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-dot" /> SQLite persistence
          <small>Evidence first. Confidence earned.</small>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button
            className="icon mobile-toggle"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <span>
            Workspace <ChevronRight size={14} /> <b>{page}</b>
          </span>
          <span className="local-label">
            <span className="local-dot" /> Local demo
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">QUALITY, MADE VISIBLE</div>
              <h1>{page === 'Dashboard' ? 'Project overview' : page}</h1>
              <p>
                {
                  {
                    Dashboard:
                      'Connect requirements to evidence. Know what still needs verification.',
                    Requirements: 'Define what your software should do.',
                    'Test cases':
                      'Turn acceptance criteria into reviewable test scenarios.',
                    'Evidence gaps':
                      'Transparent checks. Actionable next steps. No invented certainty.',
                    'Source evidence':
                      'Inspect source text for possible requirement connections.',
                    'QA report':
                      'A current snapshot of your verification evidence.',
                  }[page]
                }
              </p>
            </div>
            <button
              className="primary"
              onClick={() => reqForm()}
              disabled={!data || busy}
            >
              <Plus size={17} /> Add requirement
            </button>
          </div>
          {error && (
            <div role="alert" className="alert error">
              {error}
              <button
                onClick={() =>
                  run(async () => {
                    await loadProjects();
                    await refresh();
                  })
                }
              >
                Retry
              </button>
              <button aria-label="Dismiss error" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              {notice}
              <button aria-label="Dismiss notice" onClick={() => setNotice('')}>
                <X size={16} />
              </button>
            </div>
          )}
          <div className="project-toolbar">
            <div className="project-select">
              <span className="mini-avatar">A</span>
              <select
                aria-label="Project"
                value={pid}
                onChange={(e) => setPid(e.target.value)}
              >
                {!projects.length && <option value="">No projects</option>}
                {projects.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Badge>Demo workspace</Badge>
            </div>
            <div className="actions">
              <button
                className="subtle"
                onClick={() => setModal({ kind: 'project', name: '' })}
              >
                <Plus size={15} /> New project
              </button>
              <button
                className="icon"
                aria-label="Delete project"
                disabled={!pid || busy}
                onClick={() => {
                  if (
                    confirm(
                      'Delete this project and ALL its requirements, tests and uploaded source files?'
                    )
                  )
                    run(async () => {
                      await api(`/projects/${pid}`, 'DELETE');
                      await loadProjects();
                    }, 'Project deleted.');
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {busy && (
            <div role="status" className="working">
              Working…
            </div>
          )}
          {!data ? (
            <div className="panel empty">
              {pid ? (
                'Loading project…'
              ) : (
                <>
                  Create a project to start, or{' '}
                  <button
                    onClick={() =>
                      run(async () => {
                        const p = await api('/sample', 'POST');
                        await loadProjects(p.id);
                      }, 'Sample project added.')
                    }
                  >
                    Load sample project
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {(page === 'Dashboard' || page === 'QA report') && (
                <>
                  <div className="metrics">
                    {[
                      [
                        ListChecks,
                        'Total requirements',
                        stats.requirements,
                        'Defined in this project',
                      ],
                      [
                        FlaskConical,
                        'Linked to tests',
                        stats.covered,
                        coverage + '% of requirements',
                      ],
                      [
                        ShieldAlert,
                        'Verification findings',
                        stats.gaps,
                        'Facts & coverage heuristics',
                      ],
                      [
                        Check,
                        'Tests passed',
                        stats.Passed,
                        stats.tests + ' total test cases',
                      ],
                    ].map(([Icon, label, value, hint]) => (
                      <div className="metric" key={label}>
                        <div>
                          <span>{label}</span>
                          <Icon size={18} />
                        </div>
                        <strong>{value}</strong>
                        <small>{hint}</small>
                      </div>
                    ))}
                  </div>
                  <div className="overview-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Verification coverage</h2>
                        <Badge>Live data</Badge>
                      </div>
                      <div className="coverage-main">
                        <div
                          className="ring"
                          style={{ '--coverage': coverage + '%' }}
                        >
                          <div>
                            <strong>{coverage}%</strong>
                            <span>linked coverage</span>
                          </div>
                        </div>
                        <div className="coverage-copy">
                          <h3>
                            {stats.requirements - stats.covered} requirements
                            need tests
                          </h3>
                          <p>
                            Linked coverage measures test presence. It does not
                            prove implementation correctness.
                          </p>
                          <button
                            className="text-button"
                            onClick={() => setPage('Requirements')}
                          >
                            Review requirements <ArrowUpRight size={16} />
                          </button>
                        </div>
                      </div>
                    </section>
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Test execution</h2>
                        <FlaskConical size={18} />
                      </div>
                      <div className="execution-total">
                        <strong>{stats.tests}</strong>
                        <span>test cases</span>
                      </div>
                      <div className="stacked">
                        {['Passed', 'Failed', 'Not Run'].map((s) => (
                          <div
                            title={`${s}: ${stats[s]}`}
                            key={s}
                            className={s.toLowerCase().replace(' ', '-')}
                            style={{ flex: stats[s] || 0 }}
                          />
                        ))}
                      </div>
                      <div className="legend">
                        {['Passed', 'Failed', 'Not Run'].map((s) => (
                          <div key={s}>
                            <span>
                              <i
                                className={s.toLowerCase().replace(' ', '-')}
                              />
                              {s}
                            </span>
                            <b>{stats[s]}</b>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </>
              )}
              {page === 'Dashboard' && (
                <div className="lower-grid">
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>
                        Needs your attention{' '}
                        <span className="heading-count">{findings.length}</span>
                      </h2>
                      <button
                        className="text-button"
                        onClick={() => setPage('Evidence gaps')}
                      >
                        View all <ArrowUpRight size={15} />
                      </button>
                    </div>
                    {gapList(findings.slice(0, 3))}
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Recent activity</h2>
                      <Activity size={17} />
                    </div>
                    <div className="activity-list">
                      {data.activity.map((a) => (
                        <div className="activity" key={a.id}>
                          <span className="activity-dot" />
                          <div>
                            <p>{a.message}</p>
                            <small>{a.created_at} UTC</small>
                          </div>
                        </div>
                      ))}
                      {!data.activity.length && (
                        <p className="empty">No activity yet.</p>
                      )}
                    </div>
                  </section>
                </div>
              )}
              {(page === 'Requirements' || page === 'Test cases') && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>
                      {page}{' '}
                      <span className="heading-count">
                        {page === 'Requirements'
                          ? stats.requirements
                          : stats.tests}
                      </span>
                    </h2>
                    {page === 'Test cases' && (
                      <button
                        className="primary"
                        disabled={!data.requirements.length}
                        onClick={() => testForm()}
                      >
                        <Plus size={16} /> New test case
                      </button>
                    )}
                  </div>
                  <div className="list-toolbar">
                    <label className="search">
                      <Search size={17} />
                      <input
                        aria-label="Search"
                        placeholder="Search by title or content…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filter"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      {(page === 'Requirements'
                        ? ['All', 'High', 'Medium', 'Low']
                        : ['All', 'Not Run', 'Passed', 'Failed']
                      ).map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>
                            {page === 'Requirements'
                              ? 'Requirement'
                              : 'Test scenario'}
                          </th>
                          <th>
                            {page === 'Requirements' ? 'Priority' : 'Category'}
                          </th>
                          <th>
                            {page === 'Requirements'
                              ? 'Linked tests'
                              : 'Result'}
                          </th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(page === 'Requirements'
                          ? data.requirements
                          : data.tests
                        )
                          .filter(matches)
                          .filter(
                            (x) =>
                              filter === 'All' ||
                              (page === 'Requirements'
                                ? x.priority
                                : x.status) === filter
                          )
                          .map((x) => (
                            <tr key={x.id}>
                              <td>
                                <small className="record-id">
                                  {page === 'Requirements' ? 'REQ' : 'TC'}-
                                  {String(x.id).padStart(3, '0')}
                                </small>
                                <b>{x.title}</b>
                                <details>
                                  <summary>View details</summary>
                                  {page === 'Requirements' ? (
                                    <>
                                      <p>{x.description}</p>
                                      <strong>Acceptance criteria</strong>
                                      <p>{x.criteria}</p>
                                    </>
                                  ) : (
                                    <>
                                      <p>
                                        Requirement:{' '}
                                        {
                                          data.requirements.find(
                                            (r) => r.id === x.requirement_id
                                          )?.title
                                        }
                                      </p>
                                      <strong>Steps</strong>
                                      <p>{x.steps}</p>
                                      <strong>Expected result</strong>
                                      <p>{x.expected}</p>
                                      {x.evidence && (
                                        <>
                                          <strong>
                                            Manual execution evidence
                                          </strong>
                                          <p>{x.evidence}</p>
                                          <small>{x.executed_at} UTC</small>
                                        </>
                                      )}
                                    </>
                                  )}
                                </details>
                              </td>
                              <td>
                                <Badge>{x.priority || x.category}</Badge>
                              </td>
                              <td>
                                {page === 'Requirements' ? (
                                  data.tests.filter(
                                    (t) => t.requirement_id === x.id
                                  ).length
                                ) : (
                                  <Badge>{x.status}</Badge>
                                )}
                              </td>
                              <td>
                                <div className="actions">
                                  {page === 'Test cases' && (
                                    <button
                                      className="subtle"
                                      onClick={() =>
                                        setModal({
                                          kind: 'result',
                                          id: x.id,
                                          status: x.status,
                                          evidence: x.evidence,
                                        })
                                      }
                                    >
                                      Record result
                                    </button>
                                  )}
                                  <button
                                    className="icon"
                                    aria-label={'Edit ' + x.title}
                                    onClick={() =>
                                      page === 'Requirements'
                                        ? reqForm(x)
                                        : testForm(x)
                                    }
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    className="icon danger"
                                    aria-label={'Delete ' + x.title}
                                    onClick={() =>
                                      remove(
                                        `/${page === 'Requirements' ? 'requirements' : 'tests'}/${x.id}`,
                                        page === 'Requirements'
                                          ? 'Delete requirement and all its linked tests?'
                                          : 'Delete this test case?'
                                      )
                                    }
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {!(page === 'Requirements' ? data.requirements : data.tests)
                      .filter(matches)
                      .filter(
                        (x) =>
                          filter === 'All' ||
                          (page === 'Requirements' ? x.priority : x.status) ===
                            filter
                      ).length && (
                      <div className="empty">
                        No matching records. Add a record or adjust your
                        filters.
                      </div>
                    )}
                  </div>
                </section>
              )}
              {(page === 'Test cases' || page === 'Evidence gaps') && (
                <section className="panel suggestions">
                  <div className="panel-heading">
                    <h2>
                      <Sparkles size={18} /> Test suggestions
                    </h2>
                    <Badge>
                      {data.ai_available ? 'AI configured' : 'AI unavailable'}
                    </Badge>
                  </div>
                  <p>
                    Review suggested scenarios before saving. Basic templates
                    are generic starting points, not an AI analysis.
                  </p>
                  <div className="suggest-toolbar">
                    <select
                      aria-label="Requirement for suggestions"
                      value={selected}
                      onChange={(e) => {
                        setSelected(e.target.value);
                        setSuggested(null);
                      }}
                    >
                      <option value="">Select a requirement</option>
                      {data.requirements.map((r) => (
                        <option value={r.id} key={r.id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                    <button
                      className="primary"
                      disabled={!selected || busy}
                      onClick={() =>
                        run(async () =>
                          setSuggested({
                            ...(await api(
                              `/requirements/${selected}/suggestions`,
                              'POST'
                            )),
                            requirement_id: Number(selected),
                          })
                        )
                      }
                    >
                      <Sparkles size={16} /> Generate Test Suggestions
                    </button>
                  </div>
                  {suggested && (
                    <>
                      <p className="notice">{suggested.mode}</p>
                      <div className="suggestion-grid">
                        {suggested.suggestions.map((s, i) => (
                          <article key={i}>
                            <Badge>{s.category}</Badge>
                            <h3>{s.title}</h3>
                            <p>{s.steps}</p>
                            <strong>Expected result</strong>
                            <p>{s.expected}</p>
                            <button
                              onClick={() =>
                                testForm({
                                  ...s,
                                  requirement_id: suggested.requirement_id,
                                })
                              }
                            >
                              Review & save
                            </button>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              )}
              {page === 'Evidence gaps' && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Current findings</h2>
                    <Badge>Rule-based analysis</Badge>
                  </div>
                  <p className="panel-description">
                    Checks run on current records: missing tests, unexecuted
                    tests, recorded failures, and missing test categories.
                    Category coverage is a heuristic.
                  </p>
                  {gapList(findings)}
                </section>
              )}
              {page === 'Source evidence' && (
                <>
                  <section className="panel upload">
                    <Code2 size={30} />
                    <h2>Add source evidence</h2>
                    <p>
                      UTF-8 .py, .js, .jsx, .ts, .tsx, .java or .txt · Maximum
                      100 KB per file
                    </p>
                    <label className="upload-label">
                      Choose source file
                      <input
                        aria-label="Upload source file"
                        type="file"
                        accept=".py,.js,.jsx,.ts,.tsx,.java,.txt"
                        disabled={busy}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          e.target.value = '';
                          if (!file) return;
                          if (file.size > 100000) {
                            setError('Maximum file size is 100 KB.');
                            return;
                          }
                          run(async () => {
                            const form = new FormData();
                            form.append('file', file);
                            await mutate(
                              `/projects/${pid}/sources`,
                              'POST',
                              form
                            );
                          }, 'Source uploaded. Keyword inspection only; no code was executed.');
                        }}
                      />
                    </label>
                    <small>
                      Files are stored locally. They are never executed or
                      security-scanned.
                    </small>
                  </section>
                  {sources.map((s) => (
                    <section className="panel source" key={s.id}>
                      <div className="panel-heading">
                        <h2>
                          <Code2 size={18} />
                          {s.filename}
                        </h2>
                        <button
                          className="icon"
                          aria-label={'Delete ' + s.filename}
                          onClick={() =>
                            remove(
                              `/sources/${s.id}`,
                              'Delete this source file?'
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="notice">
                        Keyword matches are possible connections, not confirmed
                        implementation evidence.
                      </p>
                      {!s.matches.length && (
                        <p>
                          Implementation evidence could not be confirmed. No
                          requirement-title keyword matches were found.
                        </p>
                      )}
                      {s.matches.map((m) => (
                        <div key={m.requirement_id}>
                          <h3>
                            REQ-{m.requirement_id} · {m.title}
                          </h3>
                          <pre>
                            {m.excerpts
                              .map((e) => `${e.line}  ${e.text}`)
                              .join('\n')}
                          </pre>
                        </div>
                      ))}
                      <details>
                        <summary>View source text</summary>
                        <pre>{s.content}</pre>
                      </details>
                    </section>
                  ))}
                </>
              )}
              {page === 'QA report' && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Verification report</h2>
                    <a
                      className="button primary"
                      href={`${API_BASE}/projects/${pid}/report.csv`}
                    >
                      <Download size={16} /> Export CSV
                    </a>
                  </div>
                  <p className="panel-description">
                    {stats.requirements - stats.covered} requirements have no
                    linked tests. {stats['Not Run']} tests remain unexecuted.
                    Figures reflect current database records; a passed test does
                    not establish complete coverage.
                  </p>
                  {gapList(findings)}
                </section>
              )}
              <footer>
                <ScanLine size={14} /> TraceLens AI{' '}
                <span>Requirements → Tests → Evidence</span>
                <button
                  className="subtle"
                  onClick={() => {
                    if (
                      confirm(
                        'Add a new sample project? Your existing projects will be kept.'
                      )
                    )
                      run(async () => {
                        const p = await api('/sample', 'POST');
                        await loadProjects(p.id);
                      }, 'Fresh sample added.');
                  }}
                >
                  Add fresh sample
                </button>
              </footer>
            </>
          )}
        </main>
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <div className="panel-heading">
              <h2 id="dialog-title">
                {modal.kind === 'result'
                  ? 'Record manual result'
                  : modal.id
                    ? 'Edit ' + modal.kind
                    : 'New ' + modal.kind}
              </h2>
              <button
                className="icon"
                aria-label="Close dialog"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={save}>
              {Object.entries(modal)
                .filter(([k]) => !['kind', 'id'].includes(k))
                .map(([key, value]) => (
                  <label className="field" key={key}>
                    {{
                      requirement_id: 'Linked requirement',
                      criteria: 'Acceptance criteria',
                      expected: 'Expected result',
                      evidence:
                        'Manual execution notes (what you ran, actual result, environment)',
                      status: 'Result',
                    }[key] || key}
                    {[
                      'priority',
                      'category',
                      'status',
                      'requirement_id',
                    ].includes(key) ? (
                      <select
                        value={value}
                        required
                        onChange={(e) =>
                          setModal({ ...modal, [key]: e.target.value })
                        }
                      >
                        {(key === 'priority'
                          ? ['Low', 'Medium', 'High']
                          : key === 'category'
                            ? ['Positive', 'Negative', 'Boundary']
                            : key === 'status'
                              ? ['Not Run', 'Passed', 'Failed']
                              : data.requirements.map((r) => ({
                                  value: r.id,
                                  label: r.title,
                                }))
                        ).map((v) => (
                          <option key={v.value || v} value={v.value || v}>
                            {v.label || v}
                          </option>
                        ))}
                      </select>
                    ) : ['title', 'name'].includes(key) ? (
                      <input
                        autoFocus
                        required
                        maxLength={key === 'name' ? 120 : 200}
                        value={value}
                        onChange={(e) =>
                          setModal({ ...modal, [key]: e.target.value })
                        }
                      />
                    ) : (
                      <textarea
                        rows={4}
                        required={
                          key !== 'evidence' || modal.status !== 'Not Run'
                        }
                        maxLength={10000}
                        value={value}
                        onChange={(e) =>
                          setModal({ ...modal, [key]: e.target.value })
                        }
                      />
                    )}
                  </label>
                ))}
              {modal.kind === 'test' && modal.id && (
                <p className="notice">
                  Editing a test resets its execution result to Not Run.
                </p>
              )}
              {modal.kind === 'result' && (
                <p className="notice">
                  Only record Passed or Failed after you actually execute this
                  test. This application does not run tests for you.
                </p>
              )}
              {error && (
                <p role="alert" className="error-text">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button className="primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
