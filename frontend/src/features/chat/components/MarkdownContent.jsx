import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-lang">{language || 'code'}</span>
        <button className="copy-btn" onClick={handleCopy} type="button">
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={atomDark}
        customStyle={{ margin: 0, borderRadius: '0 0 0.5rem 0.5rem', background: '#111214' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

const markdownComponents = {
  code({ inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    if (!inline && match) {
      return <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
    }
    return <code className={className} {...props}>{children}</code>
  }
}

// Some models cite as 【1】; normalise to [1] so it matches the numbered source cards.
const normalizeCitations = (text) => (text || '').replace(/【(\d+)】/g, '[$1]')

const MarkdownContent = ({ content }) => (
  <ReactMarkdown components={markdownComponents}>{normalizeCitations(content)}</ReactMarkdown>
)

export default MarkdownContent
