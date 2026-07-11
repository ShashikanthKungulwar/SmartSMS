package com.mobile

import android.content.Context
import java.io.BufferedReader
import java.io.InputStreamReader

class BertTokenizer(context: Context) {

    private val vocab = HashMap<String, Int>()
    private val maxLen = 64
    private val clsToken = "[CLS]"
    private val sepToken = "[SEP]"
    private val padToken = "[PAD]"
    private val unkToken = "[UNK]"

    init {
        context.assets.open("vocab.txt").use { stream ->
            BufferedReader(InputStreamReader(stream)).useLines { lines ->
                lines.forEachIndexed { idx, token -> vocab[token] = idx }
            }
        }
    }

    // Returns Pair(inputIds, attentionMask), each length maxLen
    fun encode(text: String): Pair<IntArray, IntArray> {
        val tokens = mutableListOf(clsToken)
        tokens.addAll(wordpieceTokenize(basicTokenize(text)))
        if (tokens.size > maxLen - 1) {
            // truncate, leave room for [SEP]
            while (tokens.size > maxLen - 1) tokens.removeAt(tokens.size - 1)
        }
        tokens.add(sepToken)

        val inputIds = IntArray(maxLen) { vocab[padToken] ?: 0 }
        val attentionMask = IntArray(maxLen) { 0 }

        for (i in tokens.indices) {
            inputIds[i] = vocab[tokens[i]] ?: vocab[unkToken] ?: 0
            attentionMask[i] = 1
        }
        return Pair(inputIds, attentionMask)
    }

    // Lowercase, split on whitespace + punctuation (DistilBERT is uncased)
    private fun basicTokenize(text: String): List<String> {
        val cleaned = text.lowercase().trim()
        val out = mutableListOf<String>()
        val sb = StringBuilder()
        for (ch in cleaned) {
            if (ch.isWhitespace()) {
                if (sb.isNotEmpty()) { out.add(sb.toString()); sb.clear() }
            } else if (!ch.isLetterOrDigit()) {
                if (sb.isNotEmpty()) { out.add(sb.toString()); sb.clear() }
                out.add(ch.toString())   // punctuation as its own token
            } else {
                sb.append(ch)
            }
        }
        if (sb.isNotEmpty()) out.add(sb.toString())
        return out
    }

    // Greedy longest-match-first WordPiece
    private fun wordpieceTokenize(words: List<String>): List<String> {
        val output = mutableListOf<String>()
        for (word in words) {
            var start = 0
            val subTokens = mutableListOf<String>()
            var isBad = false
            while (start < word.length) {
                var end = word.length
                var cur: String? = null
                while (start < end) {
                    var sub = word.substring(start, end)
                    if (start > 0) sub = "##$sub"
                    if (vocab.containsKey(sub)) { cur = sub; break }
                    end--
                }
                if (cur == null) { isBad = true; break }
                subTokens.add(cur)
                start = end
            }
            if (isBad) output.add(unkToken) else output.addAll(subTokens)
        }
        return output
    }
}