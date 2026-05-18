// Generate API requests in various formats

exports.generateCurlRequest = (report) => {
  const payload = {
    title: report.title,
    description: report.description,
    severity: report.severity,
    expectedBehavior: report.expectedBehavior,
    actualBehavior: report.actualBehavior,
    reproductionSteps: report.reproductionSteps,
    environment: report.environment,
    affectedArea: report.affectedArea,
    timestamp: new Date().toISOString()
  }

  const curlCommand = `curl -X POST https://api.example.com/bugs \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '${JSON.stringify(payload, null, 2)}'`

  return curlCommand
}

exports.generatePythonRequest = (report) => {
  const payload = {
    title: report.title,
    description: report.description,
    severity: report.severity,
    expectedBehavior: report.expectedBehavior,
    actualBehavior: report.actualBehavior,
    reproductionSteps: report.reproductionSteps,
    environment: report.environment,
    affectedArea: report.affectedArea,
    timestamp: new Date().toISOString()
  }

  const pythonCode = `import requests
import json

url = "https://api.example.com/bugs"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_TOKEN"
}

payload = ${JSON.stringify(payload, null, 2)}

response = requests.post(url, headers=headers, json=payload)
print(f"Status: {response.status_code}")
print(json.dumps(response.json(), indent=2))`

  return pythonCode
}

exports.generateJavaScriptRequest = (report) => {
  const payload = {
    title: report.title,
    description: report.description,
    severity: report.severity,
    expectedBehavior: report.expectedBehavior,
    actualBehavior: report.actualBehavior,
    reproductionSteps: report.reproductionSteps,
    environment: report.environment,
    affectedArea: report.affectedArea,
    timestamp: new Date().toISOString()
  }

  const jsCode = `fetch("https://api.example.com/bugs", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_TOKEN"
  },
  body: JSON.stringify(${JSON.stringify(payload, null, 2)})
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error("Error:", error))`

  return jsCode
}

// For specific platforms
exports.generateJiraRequest = (report) => {
  const payload = {
    fields: {
      project: { key: 'QA' },
      summary: report.title,
      description: `${repport.description}

*Expected Behavior:*
${report.expectedBehavior}

*Actual Behavior:*
${report.actualBehavior}

*Steps to Reproduce:*
${report.reproductionSteps.map((step, i) => `# Step ${i + 1}: ${step}`).join('\n')}

*Environment:*
* Browser: ${report.environment.browser}
* OS: ${report.environment.os}
* Viewport: ${report.environment.viewport}`,
      priority: { name: mapSeverityToJiraPriority(report.severity) },
      issuetype: { name: 'Bug' },
      labels: ['ui-bug', 'auto-generated']
    }
  }

  return `curl -X POST https://your-jira.atlassian.net/rest/api/3/issues \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JIRA_TOKEN" \\
  -d '${JSON.stringify(payload, null, 2)}'`
}

exports.generateClickUpRequest = (report) => {
  const payload = {
    name: report.title,
    description: report.description,
    priority: mapSeverityToPriority(report.severity),
    custom_fields: [
      {
        id: 'expected_result',
        value: report.expectedBehavior
      },
      {
        id: 'actual_result',
        value: report.actualBehavior
      }
    ]
  }

  return `curl -X POST https://api.clickup.com/api/v2/list/YOUR_LIST_ID/task \\
  -H "Content-Type: application/json" \\
  -H "Authorization: YOUR_CLICKUP_TOKEN" \\
  -d '${JSON.stringify(payload, null, 2)}'`
}

function mapSeverityToJiraPriority(severity) {
  const map = {
    'Critical': 'Blocker',
    'High': 'High',
    'Medium': 'Medium',
    'Low': 'Low'
  }
  return map[severity] || 'Medium'
}

function mapSeverityToPriority(severity) {
  const map = {
    'Critical': 1,
    'High': 2,
    'Medium': 3,
    'Low': 4
  }
  return map[severity] || 3
}

module.exports = exports
