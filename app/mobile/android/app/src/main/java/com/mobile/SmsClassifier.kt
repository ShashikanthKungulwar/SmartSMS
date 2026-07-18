package com.mobile

import android.content.Context
import org.tensorflow.lite.Interpreter
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import kotlin.math.exp

class SmsClassifier(context: Context) {

    private val interpreter: Interpreter
    private val tokenizer = BertTokenizer(context)
    private val maxLen = 64

    // MUST match model.config.id2label order from training
    // private val labels = listOf("Bank", "Delivery", "OTP", "Personal", "Promo", "Spam")
    private val labels = listOf("OTP", "Bank", "Promo", "Delivery", "Spam", "Personal")

    // private val labels = listOf("OTP", "Bank", "Promo", "Delivery", "Spam", "Personal")

    init {
        val model = loadModelFile(context, "sms_classifier_fp32.tflite")
        val options = Interpreter.Options().apply {
            numThreads = 4          // multi-threaded CPU
            setUseXNNPACK(true)     // XNNPACK delegate — the latency win
        }
        interpreter = Interpreter(model, options)
        // for (i in 0 until interpreter.inputTensorCount) {
        //     android.util.Log.d("SmartSMS", "Input $i: ${interpreter.getInputTensor(i).name()}")
        // }
    }

    private fun loadModelFile(context: Context, filename: String): MappedByteBuffer {
        val fd = context.assets.openFd(filename)
        val input = fd.createInputStream()
        val channel = input.channel
        return channel.map(FileChannel.MapMode.READ_ONLY, fd.startOffset, fd.declaredLength)
    }

    data class Result(val label: String, val confidence: Float, val latencyMs: Long)

    fun classify(text: String): Result {
        val (inputIds, attentionMask) = tokenizer.encode(text)

        // TFLite expects int32 tensors, shape [1, maxLen]
        val idsBuffer = longBuffer(inputIds)
        val maskBuffer = longBuffer(attentionMask)

        val output = Array(1) { FloatArray(labels.size) }

        // Input order must match the model signature — verify with getInputTensor names
        val inputs = arrayOf<Any>(idsBuffer, maskBuffer)
        val outputs = mapOf(0 to output)

        val start = System.nanoTime()
        interpreter.runForMultipleInputsOutputs(inputs, outputs)
        val latencyMs = (System.nanoTime() - start) / 1_000_000
        android.util.Log.d("SmartSMS", "Inference: ${latencyMs}ms")
        val probs = softmax(output[0])
        val maxIdx = probs.indices.maxByOrNull { probs[it] }!!
        android.util.Log.d("SmartSMS", "IDs: ${inputIds.take(12).joinToString(",")}")
        return Result(labels[maxIdx], probs[maxIdx], latencyMs)
    }

    // private fun intBuffer(arr: IntArray): ByteBuffer {
    //     val buf = ByteBuffer.allocateDirect(arr.size * 4).order(ByteOrder.nativeOrder())
    //     for (v in arr) buf.putInt(v)
    //     buf.rewind()
    //     return buf
    // }
    private fun longBuffer(arr: IntArray): ByteBuffer {
    val buf = ByteBuffer.allocateDirect(arr.size * 8).order(ByteOrder.nativeOrder())
    for (v in arr) buf.putLong(v.toLong())
    buf.rewind()
    return buf
    }

    private fun softmax(logits: FloatArray): FloatArray {
        val max = logits.max()
        val exps = logits.map { exp((it - max).toDouble()).toFloat() }
        val sum = exps.sum()
        return exps.map { it / sum }.toFloatArray()
    }
}