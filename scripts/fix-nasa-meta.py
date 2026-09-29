# 修正 NASA PCoE 数据集的测试工况元数据（一次性订正脚本，留档备查）。
# 原 meta.vCutoff 写的是 3.47 / 3.31 / 3.04 / 3.39 V，那是某圈实测终止电压，
# 不是协议设定的放电截止电压。真实协议见 NASA PCoE Battery Data Set 与主流文献
# （MDPI Energies 18(20):5533、JETIR2606205、中文期刊 RUL 论文均一致给出）。
# 用法：python scripts/fix-nasa-meta.py
import json, os

SPECS = {
    'B0005': 2.7,
    'B0006': 2.5,
    'B0007': 2.2,
    'B0018': 2.5,
}

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'nasa')

for bid, vcut in SPECS.items():
    path = os.path.join(BASE, bid + '.json')
    with open(path, encoding='utf-8') as f:
        d = json.load(f)

    m = d['meta']
    m['vCutoff'] = vcut
    m['nominalCapacity'] = 2.0
    m['source'] = 'NASA PCoE Battery Dataset（Ames Research Center，Battery Data Set 原始 .mat 记录）'
    m['protocol'] = {
        'charge': '1.5 A 恒流充电至 4.2 V，随后恒压充电至电流降至 20 mA 以下',
        'discharge': '2.0 A（1C）恒流放电至 %s V 截止' % vcut,
        'temperature': '24 °C 恒温环境',
        'eolReference': 'NASA PCoE 以放电容量降至 1.4 Ah（额定 2.0 Ah 的 70%）作为寿命终止参考',
    }
    m['sohBasis'] = 'SOH(n) = Q(n) / qRef；qRef 取该序列首条有效放电容量，与部分文献采用的额定容量口径不同'

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, separators=(',', ':'))

    print(bid, 'vCutoff ->', vcut, 'V   cycles =', len(d['cycles']))
